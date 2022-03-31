import axios from 'axios'
import { parseCookies } from 'nookies'

const cookies = parseCookies();

export const api = axios.create({
  baseURL: 'http://localhost:3333',
})

api.defaults.headers.common['Authorization'] = `Bearer ${cookies['nextauth.token']}`
