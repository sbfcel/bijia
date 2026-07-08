import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { DEFAULT_ANTI_DETECT, PLATFORM_ANTI_DETECT, AntiDetectConfig } from '../scraper/anti-detect'

const router = Router()
router.use(authMiddleware)

const PLATFORM_NAMES: Record<string, string> = {
  jd: '京东',
  pdd: '拼多多',
  douyin: '抖音',
  tmall: '天猫',
}

const RISK_LEVELS: Record<string, { level: string; color: string; desc: string }> = {
  jd: { level: '中等', color: 'orange', desc: '滑块验证码、webdriver检测、行为轨迹分析' },
  pdd: { level: '高', color: 'red', desc: 'anti-content加密参数、设备指纹(Canvas/WebGL/Audio)、鼠标轨迹分析' },
  douyin: { level: '极高', color: '#cf1322', desc: '200+设备指纹参数、TLS指纹校验、msToken加密、X-Gorgon签名' },
  tmall: { level: '高', color: 'red', desc: '阿里宙斯六层防御、Canvas指纹、JS极致混淆、字体反爬、sign签名' },
}

router.get('/platforms', (_req: AuthRequest, res: Response) => {
  const configs = Object.entries(PLATFORM_NAMES).map(([code, name]) => {
    const antiCfg: AntiDetectConfig = PLATFORM_ANTI_DETECT[code] || DEFAULT_ANTI_DETECT
    const risk = RISK_LEVELS[code] || { level: '未知', color: 'default', desc: '' }

    return {
      code,
      name,
      riskLevel: risk.level,
      riskColor: risk.color,
      riskDesc: risk.desc,
      config: {
        delayRange: `${antiCfg.delayMin / 1000}s - ${antiCfg.delayMax / 1000}s`,
        maxRetries: antiCfg.maxRetries,
        scrollPages: antiCfg.scrollPages,
      },
      measures: [
        'navigator.webdriver 隐藏',
        'WebGL 指纹伪装',
        'User-Agent 轮换（8个UA池）',
        '随机窗口尺寸',
        '人类行为模拟（鼠标移动 + 滚动）',
        '请求间隔随机化',
        '指数退避重试',
        '验证码/风控页面检测',
      ],
    }
  })

  res.json(configs)
})

export default router
