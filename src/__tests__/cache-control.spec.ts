import { ApolloServer } from 'apollo-server'
import gql from 'graphql-tag'
import { cacheControlPlugin, responseCachePlugin } from '..'
const typeDefs = gql`
  type Post @cacheControl(maxAge: 1, staleWhileRevalidate: 1, scope: PUBLIC) {
    id: String
  }

  type User @cacheControl(maxAge: 1, staleWhileRevalidate: 10, scope: PRIVATE) {
    id: String
    name: String
  }

  type Query {
    User(id: ID!): User
    Post(id: ID!): Post
  }

  directive @cacheControl(
    maxAge: Int
    staleWhileRevalidate: Int
    scope: CacheControlScope
  ) on OBJECT | FIELD_DEFINITION

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }
`

const resolvers = {
  Query: {
    User(id: string) {
      return {
        id,
      }
    },
    Post(id: string) {
      return {
        id,
      }
    },
  },
  Post: {
    id() {
      return '1'
    },
  },
  User: {
    name() {
      return Math.random()
    },
  },
}

const GET_USER = gql`
  query GetUser($id: ID!) {
    User(id: $id) {
      id
      name
    }
  }
`

const GET_POST = gql`
  query GetPost($id: ID!) {
    Post(id: $id) {
      id
    }
  }
`

const GET_USER_AND_POST = gql`
  query GetUserAndPost($id: ID!) {
    User(id: $id) {
      id
      name
    }
    Post(id: $id) {
      id
    }
  }
`

describe('cache-control', () => {
  let currentUserId = '1'

  const server = new ApolloServer({
    cacheControl: false,
    typeDefs,
    resolvers,
    plugins: [
      cacheControlPlugin(),
      responseCachePlugin({
        nodeFQCTTL: 10000,
        sessionId: () => currentUserId,
      }),
    ],
  })

  it('should be privately cached', async () => {
    {
      const result = await server.executeOperation({
        query: GET_USER,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=10, private'
      )
      expect(headers.get('apollo-cache-status')).toBe('MISS')
    }

    const result2 = await server.executeOperation({
      query: GET_USER,
      variables: { id: '1' },
    })

    const headers2 = result2.http!.headers
    expect(headers2.get('Cache-Control')).toBe(
      'max-age=1, stale-while-revalidate=10, private'
    )
    expect(headers2.get('apollo-cache-status')).toBe('HIT')

    currentUserId = '2'

    {
      const result = await server.executeOperation({
        query: GET_USER,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=10, private'
      )
      expect(headers.get('apollo-cache-status')).toBe('MISS')
    }
  })

  it('should be publicly cached', async () => {
    {
      const result = await server.executeOperation({
        query: GET_POST,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=1, public'
      )
      expect(headers.get('apollo-cache-status')).toBe('MISS')
    }

    {
      const result = await server.executeOperation({
        query: GET_POST,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=1, public'
      )
      expect(headers.get('apollo-cache-status')).toBe('HIT')
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    {
      const result = await server.executeOperation({
        query: GET_POST,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=1, public'
      )
      expect(headers.get('apollo-cache-status')).toBe('STALE')
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    {
      const result = await server.executeOperation({
        query: GET_POST,
        variables: { id: '1' },
      })

      const headers = result.http!.headers
      expect(headers.get('Cache-Control')).toBe(
        'max-age=1, stale-while-revalidate=1, public'
      )
      expect(headers.get('apollo-cache-status')).toBe('MISS')
    }
  })
})
