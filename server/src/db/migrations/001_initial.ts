import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary()
    table.string('username').notNullable().unique()
    table.string('password_hash').notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('platforms', (table) => {
    table.increments('id').primary()
    table.string('code').notNullable().unique()
    table.string('name').notNullable()
    table.string('icon').nullable()
    table.integer('enabled').defaultTo(1)
    table.text('parser_config').nullable()
    table.text('search_url_template').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('keywords', (table) => {
    table.increments('id').primary()
    table.integer('user_id').notNullable().references('id').inTable('users')
    table.string('text').notNullable()
    table.float('price_limit').notNullable()
    table.integer('interval_minutes').defaultTo(30)
    table.integer('enabled').defaultTo(1)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('keyword_platforms', (table) => {
    table.increments('id').primary()
    table.integer('keyword_id').notNullable().references('id').inTable('keywords').onDelete('CASCADE')
    table.integer('platform_id').notNullable().references('id').inTable('platforms')
    table.unique(['keyword_id', 'platform_id'])
  })

  await knex.schema.createTable('products', (table) => {
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

  await knex.schema.createTable('scrape_logs', (table) => {
    table.increments('id').primary()
    table.integer('keyword_id').notNullable().references('id').inTable('keywords').onDelete('CASCADE')
    table.integer('platform_id').notNullable().references('id').inTable('platforms')
    table.string('status').notNullable()
    table.text('error_message').nullable()
    table.integer('product_count').defaultTo(0)
    table.timestamp('started_at').notNullable()
    table.timestamp('completed_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scrape_logs')
  await knex.schema.dropTableIfExists('products')
  await knex.schema.dropTableIfExists('keyword_platforms')
  await knex.schema.dropTableIfExists('keywords')
  await knex.schema.dropTableIfExists('platforms')
  await knex.schema.dropTableIfExists('users')
}
