import axios, { Axios, AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { resolve } from 'path';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue: any[] = [];

export const api = axios.create({
  baseURL: 'http://localhost:3333',
})

api.defaults.headers.common['Authorization'] = `Bearer ${cookies['nextauth.token']}`

api.interceptors.response.use(response => {
  return response;
}, (error: AxiosError) => {
  if (error.response?.status === 401) {
    if (error.response.data?.code === 'token.expired') {
      // renovar o token
      cookies = parseCookies();

      const { 'nextauth.refreshToken': refreshToken } = cookies;
      const originalConfig = error.config;

      if (!isRefreshing) {
        isRefreshing = true;
        api.post('/refresh', {
          refreshToken,
        }).then(response => {
          const { token } = response.data

          setCookie(undefined, 'nextauth.token', token, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/' // global
          })
          setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/' // global
          })

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          failedRequestsQueue.forEach(request => request.onSuccess(token))
          failedRequestsQueue = [];
        })
          .catch(err => {
            failedRequestsQueue.forEach(request => request.onFailure(err))
            failedRequestsQueue = [];
          })
          .finally(() => {
            isRefreshing = false;
          })
      }

      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({
          onSuccess: (token: string) => {
            if (!originalConfig?.headers) return;

            originalConfig.headers['Authorization'] = `Bearer ${token}`

            resolve(api(originalConfig))
          },
          onFailure: (err: AxiosError) => {
            reject(err)
          },
        })
      })
    }
    else {
      // deslogar o usuario
    }
  }
})