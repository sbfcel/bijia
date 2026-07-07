import { PlatformParser } from './types'
import { jdParser } from './jd'
import { pddParser } from './pdd'
import { douyinParser } from './douyin'
import { tmallParser } from './tmall'

const parsers: Record<string, PlatformParser> = {
  jd: jdParser,
  pdd: pddParser,
  douyin: douyinParser,
  tmall: tmallParser,
}

export function getParser(code: string): PlatformParser | undefined {
  return parsers[code]
}
