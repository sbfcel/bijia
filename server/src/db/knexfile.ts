import type { Knex } from 'knex'

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: './data.db',
  },
  useNullAsDefault: true,
}

export default config
