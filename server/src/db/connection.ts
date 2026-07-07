import knex from 'knex'
import config from './knexfile'

const db = knex(config)

export default db

export async function runMigrations() {
  console.log('Running migrations...')

  const exists = await db.schema.hasTable('users')
  if (exists) {
    console.log('Tables already exist, skipping migration.')
    return
  }

  await db.schema.createTable('users', (table) => {
    table.increments('id').primary()
    table.string('username').notNullable().unique()
    table.string('password_hash').notNullable()
    table.timestamp('created_at').defaultTo(db.fn.now())
  })

  await db.schema.createTable('platforms', (table) => {
    table.increments('id').primary()
    table.string('code').notNullable().unique()
    table.string('name').notNullable()
    table.string('icon').nullable()
    table.integer('enabled').defaultTo(1)
    table.text('parser_config').nullable()
    table.text('search_url_template').nullable()
    table.timestamp('created_at').defaultTo(db.fn.now())
  })

  await db.schema.createTable('keywords', (table) => {
    table.increments('id').primary()
    table.integer('user_id').notNullable().references('id').inTable('users')
    table.string('text').notNullable()
    table.float('price_limit').notNullable()
    table.integer('interval_minutes').defaultTo(30)
    table.integer('enabled').defaultTo(1)
    table.timestamp('created_at').defaultTo(db.fn.now())
    table.timestamp('updated_at').defaultTo(db.fn.now())
  })

  await db.schema.createTable('keyword_platforms', (table) => {
    table.increments('id').primary()
    table.integer('keyword_id').notNullable().references('id').inTable('keywords').onDelete('CASCADE')
    table.integer('platform_id').notNullable().references('id').inTable('platforms')
    table.unique(['keyword_id', 'platform_id'])
  })

  await db.schema.createTable('products', (table) => {
    table.increments('id').primary()
    table.integer('keyword_id').notNullable().references('id').inTable('keywords').onDelete('CASCADE')
    table.integer('platform_id').notNullable().references('id').inTable('platforms')
    table.string('shop_name').notNullable()
    table.string('product_name').notNullable()
    table.float('price').notNullable()
    table.string('shop_url').nullable()
    table.string('product_url').nullable()
    table.string('image_url').nullable()
    table.timestamp('scraped_at').notNullable()
    table.integer('below_limit').defaultTo(0)
    table.unique(['keyword_id', 'platform_id', 'shop_name'])
  })

  await db.schema.createTable('scrape_logs', (table) => {
    table.increments('id').primary()
    table.integer('keyword_id').notNullable().references('id').inTable('keywords').onDelete('CASCADE')
    table.integer('platform_id').notNullable().references('id').inTable('platforms')
    table.string('status').notNullable()
    table.text('error_message').nullable()
    table.integer('product_count').defaultTo(0)
    table.timestamp('started_at').notNullable()
    table.timestamp('completed_at').nullable()
  })

  console.log('Migrations completed.')
}

export async function runSeeds() {
  console.log('Running seeds...')

  const count = await db('platforms').count('id as cnt').first()
  if (count && Number(count.cnt) > 0) {
    console.log('Platforms already seeded, skipping.')
    return
  }

  await db('platforms').insert([
    {
      code: 'jd',
      name: '京东',
      icon: 'jd',
      enabled: 1,
      search_url_template: 'https://search.jd.com/Search?keyword={keyword}&enc=utf-8',
      parser_config: JSON.stringify({
        productSelector: '.gl-item',
        titleSelector: '.p-name em',
        priceSelector: '.p-price i',
        shopSelector: '.p-shop span',
        linkSelector: '.p-name a',
      }),
    },
    {
      code: 'pdd',
      name: '拼多多',
      icon: 'pdd',
      enabled: 1,
      search_url_template: 'https://mobile.yangkeduo.com/search_result.html?search_key={keyword}',
      parser_config: JSON.stringify({
        productSelector: '.search-result-item',
        titleSelector: '.goods-title',
        priceSelector: '.goods-price',
        shopSelector: '.mall-name',
        linkSelector: 'a.goods-link',
      }),
    },
    {
      code: 'douyin',
      name: '抖音',
      icon: 'douyin',
      enabled: 1,
      search_url_template: 'https://haohuo.jinritemai.com/views/search/list?keyword={keyword}',
      parser_config: JSON.stringify({
        productSelector: '.product-card',
        titleSelector: '.product-title',
        priceSelector: '.price-text',
        shopSelector: '.shop-name',
        linkSelector: 'a.product-link',
      }),
    },
    {
      code: 'tmall',
      name: '天猫',
      icon: 'tmall',
      enabled: 1,
      search_url_template: 'https://list.tmall.com/search_product.htm?q={keyword}',
      parser_config: JSON.stringify({
        productSelector: '.product-item',
        titleSelector: '.productTitle a',
        priceSelector: '.productPrice em',
        shopSelector: '.productShop a',
        linkSelector: '.productTitle a',
      }),
    },
  ])

  console.log('Seeds completed.')
}

export async function setupDatabase() {
  await runMigrations()
  await runSeeds()
  console.log('Database setup complete.')
}
