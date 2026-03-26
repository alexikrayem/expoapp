const http = require('http')
const { Readable, Duplex } = require('stream')
const { URLSearchParams } = require('url')

class MockSocket extends Duplex {
  _read() {}
  _write(_chunk, _encoding, callback) {
    callback()
  }
}

class InProcessRequest {
  constructor(app, method, path) {
    this.app = app
    this.method = method
    this.path = path
    this.headers = {}
    this.queryParams = null
    this.body = undefined
  }

  set(name, value) {
    if (!name) return this
    this.headers[String(name).toLowerCase()] = String(value)
    return this
  }

  query(params) {
    if (!params) return this
    this.queryParams = { ...(this.queryParams || {}), ...params }
    return this
  }

  send(body) {
    this.body = body
    return this
  }

  then(resolve, reject) {
    return this._exec().then(resolve, reject)
  }

  catch(reject) {
    return this._exec().catch(reject)
  }

  finally(handler) {
    return this._exec().finally(handler)
  }

  _buildUrl() {
    if (!this.queryParams) return this.path
    const params = new URLSearchParams()
    Object.entries(this.queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, String(entry)))
      } else if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    if (!queryString) return this.path
    return this.path.includes('?')
      ? `${this.path}&${queryString}`
      : `${this.path}?${queryString}`
  }

  _exec() {
    return new Promise((resolve, reject) => {
      const url = this._buildUrl()
      const req = new Readable({ read() {} })
      req.method = this.method.toUpperCase()
      req.url = url
      req.headers = { ...this.headers }

      const socket = new MockSocket()
      socket.remoteAddress = '127.0.0.1'
      req.connection = socket
      req.socket = socket

      let bodyBuffer
      if (this.body !== undefined) {
        if (Buffer.isBuffer(this.body)) {
          bodyBuffer = this.body
        } else if (typeof this.body === 'string') {
          bodyBuffer = Buffer.from(this.body)
        } else {
          bodyBuffer = Buffer.from(JSON.stringify(this.body))
          if (!req.headers['content-type']) {
            req.headers['content-type'] = 'application/json'
          }
        }
        req.headers['content-length'] = String(bodyBuffer.length)
      }

      const res = new http.ServerResponse(req)
      res.assignSocket(socket)

      const chunks = []
      let resolved = false
      const originalWrite = res.write.bind(res)
      const originalEnd = res.end.bind(res)

      res.write = (chunk, encoding, cb) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
        }
        return originalWrite(chunk, encoding, cb)
      }

      const finalize = () => {
        if (resolved) return
        resolved = true
        const rawBody = Buffer.concat(chunks).toString('utf8')
        const contentType = String(res.getHeader('content-type') || '')
        let parsedBody = rawBody

        if (rawBody && (contentType.includes('application/json') || contentType.includes('+json'))) {
          try {
            parsedBody = JSON.parse(rawBody)
          } catch (_) {
            parsedBody = rawBody
          }
        }

        resolve({
          status: res.statusCode || 200,
          body: parsedBody,
          headers: res.getHeaders()
        })
      }

      res.end = (chunk, encoding, cb) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
        }
        const result = originalEnd(chunk, encoding, cb)
        finalize()
        return result
      }

      res.on('finish', finalize)

      res.on('error', reject)

      try {
        if (typeof this.app.handle === 'function') {
          this.app.handle(req, res)
        } else {
          this.app(req, res)
        }
      } catch (error) {
        reject(error)
      }

      setImmediate(() => {
        if (bodyBuffer) {
          req.push(bodyBuffer)
        }
        req.push(null)
      })
    })
  }
}

const request = (app) => ({
  get: (path) => new InProcessRequest(app, 'GET', path),
  post: (path) => new InProcessRequest(app, 'POST', path),
  put: (path) => new InProcessRequest(app, 'PUT', path),
  patch: (path) => new InProcessRequest(app, 'PATCH', path),
  delete: (path) => new InProcessRequest(app, 'DELETE', path)
})

module.exports = request
