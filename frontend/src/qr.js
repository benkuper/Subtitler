import { mount } from 'svelte'
import QrPage from './QrPage.svelte'

const app = mount(QrPage, {
  target: document.getElementById('app'),
})

export default app
