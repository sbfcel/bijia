import type { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  await knex('platforms').del()

  await knex('platforms').insert([
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
}
