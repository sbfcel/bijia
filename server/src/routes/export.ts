import { Router, Response } from 'express'
import ExcelJS from 'exceljs'
import { stringify } from 'csv-stringify'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

async function getExportData(req: AuthRequest) {
  const { keyword_id, platform_id, ids } = req.query

  let query = db('products')
    .join('keywords', 'products.keyword_id', 'keywords.id')
    .join('platforms', 'products.platform_id', 'platforms.id')
    .where('keywords.user_id', req.userId)
    .where('products.below_limit', 1)

  if (keyword_id) query = query.where('products.keyword_id', keyword_id)
  if (platform_id) query = query.where('products.platform_id', platform_id)
  if (ids) {
    const idList = (ids as string).split(',').map(Number)
    query = query.whereIn('products.id', idList)
  }

  return query.select(
    'platforms.name as platform_name',
    'products.shop_name',
    'products.product_name',
    'products.price',
    'keywords.price_limit',
    'products.shop_url',
    'products.product_url',
    'products.scraped_at'
  ).orderBy('platforms.name').orderBy('products.price')
}

router.get('/excel', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await getExportData(req)

    const workbook = new ExcelJS.Workbook()
    const platforms = new Map<string, ExcelJS.Worksheet>()

    const headers = ['店铺名称', '产品名称', '产品价格', '限价', '店铺链接', '商品链接', '采集时间']

    for (const row of rows) {
      const platformName = row.platform_name || '未知平台'
      if (!platforms.has(platformName)) {
        const sheet = workbook.addWorksheet(platformName)
        sheet.addRow(headers)
        platforms.set(platformName, sheet)
      }

      const sheet = platforms.get(platformName)!
      sheet.addRow([
        row.shop_name,
        row.product_name,
        row.price,
        row.price_limit,
        row.shop_url || '',
        row.product_url || '',
        row.scraped_at,
      ])
    }

    if (platforms.size === 0) {
      workbook.addWorksheet('数据').addRow(headers)
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="products_${Date.now()}.xlsx"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    res.status(500).json({ error: '导出 Excel 失败' })
  }
})

router.get('/csv', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await getExportData(req)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="products_${Date.now()}.csv"`)

    const stringifier = stringify({
      header: true,
      columns: [
        { key: 'platform_name', header: '平台名称' },
        { key: 'shop_name', header: '店铺名称' },
        { key: 'product_name', header: '产品名称' },
        { key: 'price', header: '产品价格' },
        { key: 'price_limit', header: '限价' },
        { key: 'shop_url', header: '店铺链接' },
        { key: 'product_url', header: '商品链接' },
        { key: 'scraped_at', header: '采集时间' },
      ],
    })

    stringifier.pipe(res)
    for (const row of rows) {
      stringifier.write(row)
    }
    stringifier.end()
  } catch (error) {
    res.status(500).json({ error: '导出 CSV 失败' })
  }
})

export default router
