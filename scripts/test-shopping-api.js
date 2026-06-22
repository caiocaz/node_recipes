const base = 'http://localhost'

const register = async (name, email, password) => {
  const params = new URLSearchParams()
  params.append('name', name)
  params.append('email', email)
  params.append('password', password)
  params.append('confirmPassword', password)

  const res = await fetch(`${base}/register`, {
    method: 'POST',
    body: params,
    redirect: 'manual'
  })

  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('No set-cookie on register')
  const cookie = setCookie.split(';')[0]
  return cookie
}

const api = async (path, opts = {}, cookie) => {
  const headers = opts.headers || {}
  if (cookie) headers.Cookie = cookie
  const res = await fetch(`${base}${path}`, { ...opts, headers, redirect: 'manual' })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch (e) { json = text }
  return { status: res.status, body: json }
}

(async function(){
  try {
    const ts = Date.now()
    const email = `test+${ts}@example.com`
    const cookie = await register('Api Tester', email, 'Aa1!test123')
    console.log('registered cookie', cookie)

    // Add item
    const add = await api('/shopping-list/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tomate', quantity: '2', unit: 'un', origin: 'Manual' })
    }, cookie)
    console.log('add status', add.status)
    console.log('add body', add.body)

    const items = await api('/shopping-list/items', { method: 'GET' }, cookie)
    console.log('items', items.status, Array.isArray(items.body) ? items.body.length : typeof items.body)
    const first = Array.isArray(items.body) && items.body[0]
    if (!first) return

    // Edit item
    const upd = await api(`/shopping-list/items/${first.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tomate (fresco)' })
    }, cookie)
    console.log('update status', upd.status)
    console.log('update body', upd.body)

    // Delete item
    const del = await api(`/shopping-list/items/${first.id}`, { method: 'DELETE' }, cookie)
    console.log('delete status', del.status)
    console.log('delete body', del.body)
  } catch (err) {
    console.error('test error', err)
  }
})()
