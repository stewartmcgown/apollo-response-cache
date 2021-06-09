import 'apollo-server-types'
import { CacheHint } from './types/'

declare module 'apollo-server-types' {
  export interface GraphQLRequestContext {
    overallCachePolicy?: Required<CacheHint>
  }
}
