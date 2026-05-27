import adapter from '@sveltejs/adapter-static'

const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: '/nexus'
    },
    prerender: {
      entries: ['*']
    }
  }
}

export default config