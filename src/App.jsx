import React, { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseReady, STORAGE_BUCKET, WHATSAPP_URL } from './supabase'
import { Menu, X, Gem, Instagram, MessageCircle, ArrowUpRight, ShieldCheck, Plus, Pencil, Trash2, LogOut, Upload, Eye, EyeOff, RefreshCw } from 'lucide-react'

const SHOP = {
  name: 'Talha Jewelers',
  address: 'Sarafa Bazar, Kashmiri Market, Muridke, Punjab, Pakistan',
  tagline: 'Timeless elegance. Crafted to be cherished.'
}
const categories = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Bangles', 'Sets', 'Other']
const money = n => `PKR ${Number(n || 0).toLocaleString('en-PK')}`

function App() {
  const [products, setProducts] = useState([])
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', category:'Rings', price:'', description:'', is_published:true })
  const [photos, setPhotos] = useState([])
  const [rateForm, setRateForm] = useState({ gold:'', gold22k:'', silver:'' })
  const [notice, setNotice] = useState('')

  const filtered = useMemo(() => category === 'All' ? products : products.filter(p => p.category === category), [products, category])

  async function loadData() {
    if (!supabaseReady) { setLoading(false); return }
    setLoading(true)
    const [p, r] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending:false }),
      supabase.from('metal_rates').select('*').order('updated_at', { ascending:false })
    ])
    if (!p.error) setProducts(p.data || [])
    if (!r.error) setRates(r.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!supabaseReady) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    loadData()
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const latest = {}
    rates.forEach(r => { latest[String(r.metal || '').toLowerCase()] ??= r })
    setRateForm({ gold: latest.gold?.price_per_tola ?? '', gold22k: latest.gold_22k?.price_per_tola ?? '', silver: latest.silver?.price_per_tola ?? '' })
  }, [rates])

  const publishedProducts = products.filter(p => p.is_published)
  const visibleProducts = session ? filtered : (category === 'All' ? publishedProducts : publishedProducts.filter(p => p.category === category))

  function waLink(product) {
    const msg = product ? `Assalam-o-Alaikum, I am interested in ${product.name}. Displayed price: ${money(product.price)}. Please share details.` : `Assalam-o-Alaikum, I would like to know more about Talha Jewelers.`
    return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`
  }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function login(e) {
    e.preventDefault(); setBusy(true); setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
    else { setPassword(''); setNotice('Login successful.') }
    setBusy(false)
  }
  async function logout() { await supabase.auth.signOut(); setAdminOpen(false); setNotice('You are signed out.') }

  function startNew() {
    setEditing(null)
    setForm({ name:'', category:'Rings', price:'', description:'', is_published:true })
    setPhotos([])
  }
  function startEdit(p) {
    setEditing(p)
    setForm({ name:p.name || '', category:p.category || 'Other', price:p.price ?? '', description:p.description || '', is_published:!!p.is_published })
    setPhotos([])
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  async function saveProduct(e) {
    e.preventDefault()
    if (!form.name.trim() || form.price === '') { setNotice('Please add product name and price.'); return }
    setBusy(true); setNotice('')
    try {
      let imageUrls = editing?.images || []
      if (photos.length) {
        const uploaded = []
        for (const file of photos) {
          const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
          const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${clean}`
          const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert:false })
          if (upErr) throw upErr
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
          uploaded.push(data.publicUrl)
        }
        imageUrls = [...imageUrls, ...uploaded]
      }
      const payload = {
        name: form.name.trim(), category: form.category, price: Number(form.price),
        description: form.description.trim(), images: imageUrls, is_published: !!form.is_published
      }
      const result = editing
        ? await supabase.from('products').update(payload).eq('id', editing.id)
        : await supabase.from('products').insert(payload)
      if (result.error) throw result.error
      setNotice(editing ? 'Product updated.' : 'Product added.')
      startNew(); await loadData()
    } catch (err) { setNotice(`Could not save: ${err.message}`) }
    setBusy(false)
  }

  async function togglePublish(p) {
    const { error } = await supabase.from('products').update({ is_published: !p.is_published }).eq('id', p.id)
    setNotice(error ? error.message : (p.is_published ? 'Product hidden.' : 'Product published.'))
    if (!error) loadData()
  }
  async function deleteProduct(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    setNotice(error ? error.message : 'Product deleted.')
    if (!error) { if (editing?.id === p.id) startNew(); loadData() }
  }
  async function saveRates(e) {
    e.preventDefault(); setBusy(true); setNotice('')
    try {
      for (const [metal, value] of [['gold', rateForm.gold], ['gold_22k', rateForm.gold22k], ['silver', rateForm.silver]]) {
        if (value === '' || Number(value) <= 0) continue
        const { error } = await supabase.from('metal_rates').insert({ metal, price_per_tola:Number(value), updated_at:new Date().toISOString() })
        if (error) throw error
      }
      setNotice('Metal rates updated.'); await loadData()
    } catch (err) { setNotice(`Could not update rates: ${err.message}`) }
    setBusy(false)
  }

  return <div className="app">
    <header className="header">
      <a className="brand header-brand" href="#home" onClick={() => setMobileMenu(false)}><img className="header-logo-photo" src=" /talha-portrait.png" alt="Talha Islam"/><span><b>TALHA</b><small>JEWELERS</small></span></a>
      <nav className={mobileMenu ? 'nav open' : 'nav'}>
        <a href="#home" onClick={() => setMobileMenu(false)}>Home</a><a href="#collection" onClick={() => setMobileMenu(false)}>Collection</a><a href="#about" onClick={() => setMobileMenu(false)}>Our Story</a>
        <a className="nav-contact" href={waLink()} target="_blank" rel="noreferrer">Contact <ArrowUpRight size={14}/></a>
      </nav>
      <button className="menu-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
    </header>

    {!supabaseReady && <div className="setup-warning">Website setup is not connected yet. Add your Supabase environment variables before publishing.</div>}

    <main>
      <section className="hero" id="home">
        <div className="hero-copy"><p className="eyebrow"><span/> EST. WITH ELEGANCE</p><div className="family-portraits"><div className="family-person"><img src="ustad-amjad-portrait.png" alt="Ustad Amjad Islam Zargar"/><span>استاد امجد اسلام ذرگر</span></div><div className="family-person"><img src="/talha-portrait.png" alt="Talha Islam"/><span>طلحہ اسلام</span></div></div><h1>Jewellery that<br/><em>tells your story.</em></h1><p className="hero-text">Discover timeless pieces, thoughtfully chosen to celebrate your most meaningful moments.</p><a className="gold-btn" href="#collection">Explore Collection <ArrowUpRight size={16}/></a><div className="hero-note"><span className="note-line"/> CRAFTED FOR YOUR FOREVER</div></div>
        <div className="hero-art"><div className="art-glow"/><div className="art-frame"><div className="art-inner"><Gem size={94} strokeWidth={0.75}/><span>TIMELESS<br/>BEAUTY</span></div></div><div className="art-caption">THE ART OF ADORNMENT <b>01 / 03</b></div></div>
      </section>

      <section className="ticker"><span>TIMELESS DESIGN</span><i>✦</i><span>EVERLASTING VALUE</span><i>✦</i><span>MADE TO BE YOURS</span><i>✦</i><span>TIMELESS DESIGN</span></section>

      <section className="collection section" id="collection">
        <div className="section-heading"><div><p className="eyebrow">CURATED WITH CARE</p><h2>The Collection<span>.</span></h2></div><p className="section-desc">A little something special for every chapter of your life.</p></div>
        <div className="filters">{categories.map(c => <button key={c} className={category===c?'filter active':'filter'} onClick={() => setCategory(c)}>{c}</button>)}</div>
        {loading ? <div className="empty">Loading collection…</div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map(p => <article className="product-card" key={p.id}>
          <button className="product-image" onClick={() => setSelected(p)} aria-label={`View ${p.name}`}>{p.images?.[0] ? <img src={p.images[0]} alt={p.name}/> : <div className="image-placeholder"><Gem size={42}/><span>TALHA JEWELERS</span></div>}<span className="view-label">VIEW DETAILS <ArrowUpRight size={13}/></span></button>
          <div className="product-info"><div><p>{p.category}</p><h3>{p.name}</h3></div><strong>{money(p.price)}</strong></div>
        </article>)}</div> : <div className="empty"><Gem size={28}/><h3>Our collection is being prepared.</h3><p>New pieces will appear here soon. Please check back.</p></div>}
      </section>

      <section className="rates section"><div><p className="eyebrow">MARKET WATCH</p><h2>Metal rates<span>.</span></h2><p className="rates-note">Indicative shop-updated rates per tola. Please confirm before purchase.</p></div><div className="rate-cards">{[{key:'gold',label:'24K GOLD'},{key:'gold_22k',label:'22K GOLD'},{key:'silver',label:'SILVER'}].map(m => { const r = rates.find(x => String(x.metal).toLowerCase()===m.key); return <div className="rate-card" key={m.key}><span>{m.label}</span><b>{r ? money(r.price_per_tola) : '—'}</b><small>{r ? `Updated ${new Date(r.updated_at).toLocaleDateString()}` : 'Rate not yet added'}</small></div> })}</div></section>

      <section className="about section" id="about"><div className="about-art"><div className="about-seal"><Gem size={42}/><span>EST. IN<br/>MURIDKE</span></div></div><div className="about-copy"><p className="eyebrow">A NAME YOU CAN TRUST</p><h2>More than jewellery.<br/><em>A lasting memory.</em></h2><p>At Talha Jewelers, we believe every piece carries a story. We are here to help you find jewellery for the moments that matter — with personal attention and care.</p><div className="address"><span>VISIT OUR SHOP</span><p>{SHOP.address}</p></div><a className="text-link" href={waLink()} target="_blank" rel="noreferrer">Get in touch <ArrowUpRight size={15}/></a></div></section>
    </main>

    <footer className="footer"><a className="brand" href="#home"><span className="brand-mark"><Gem size={20}/></span><span><b>TALHA</b><small>JEWELERS</small></span></a><p>Timeless elegance. Crafted to be cherished.</p><div>© {new Date().getFullYear()} Talha Jewelers</div><button className="admin-trigger" onClick={() => setAdminOpen(true)}><ShieldCheck size={14}/> Admin</button></footer>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="product-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}><X/></button><div className="modal-photo">{selected.images?.[0] ? <img src={selected.images[0]} alt={selected.name}/> : <div className="image-placeholder"><Gem size={50}/></div>}</div><div className="modal-copy"><p className="eyebrow">{selected.category}</p><h2>{selected.name}</h2><strong>{money(selected.price)}</strong><p>{selected.description || 'A timeless piece selected with care.'}</p><a className="gold-btn" href={waLink(selected)} target="_blank" rel="noreferrer"><MessageCircle size={16}/> Enquire on WhatsApp</a></div></div></div>}

    {adminOpen && <div className="modal-backdrop admin-backdrop" onClick={() => setAdminOpen(false)}><div className="admin-panel" onClick={e => e.stopPropagation()}><div className="admin-head"><div><p className="eyebrow">TALHA JEWELERS</p><h2>Admin dashboard</h2></div><button className="modal-close" onClick={() => setAdminOpen(false)}><X/></button></div>
      {!session ? <form className="login-form" onSubmit={login}><p>Sign in with your authorised shop account.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{loginError && <p className="error">{loginError}</p>}<button className="gold-btn full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form> :
      <div className="admin-content"><div className="admin-toolbar"><span>Signed in as {session.user.email}</span><button className="outline-btn" onClick={logout}><LogOut size={14}/> Sign out</button></div>
        <form className="admin-form" onSubmit={saveProduct}><h3>{editing?'Edit product':'Add a product'}</h3><div className="form-grid"><label>Product name<input value={form.name} onChange={e=>setField('name',e.target.value)} required/></label><label>Category<select value={form.category} onChange={e=>setField('category',e.target.value)}>{categories.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select></label><label>Price (PKR)<input type="number" min="0" value={form.price} onChange={e=>setField('price',e.target.value)} required/></label><label className="file-label">Product photos<input type="file" accept="image/*" multiple onChange={e=>setPhotos(Array.from(e.target.files||[]))}/><small>{photos.length ? `${photos.length} photo(s) selected` : 'Choose multiple photos from your phone'}</small></label></div><label>Description<textarea rows="3" value={form.description} onChange={e=>setField('description',e.target.value)} placeholder="Add product details…"/></label><label className="check-row"><input type="checkbox" checked={form.is_published} onChange={e=>setField('is_published',e.target.checked)}/> Publish on customer website</label><div className="form-actions"><button className="gold-btn" disabled={busy}><Upload size={15}/>{busy?'Saving…':editing?'Save changes':'Add product'}</button>{editing && <button type="button" className="outline-btn" onClick={startNew}>Cancel edit</button>}</div></form>
        <form className="admin-form rates-admin" onSubmit={saveRates}><h3>Update metal rates (PKR / tola)</h3><div className="form-grid"><label>24K Gold<input type="number" min="1" value={rateForm.gold} onChange={e=>setRateForm(f=>({...f,gold:e.target.value}))} placeholder="24K Gold rate"/></label><label>22K Gold<input type="number" min="1" value={rateForm.gold22k} onChange={e=>setRateForm(f=>({...f,gold22k:e.target.value}))} placeholder="22K Gold rate"/></label><label>Silver<input type="number" min="1" value={rateForm.silver} onChange={e=>setRateForm(f=>({...f,silver:e.target.value}))} placeholder="Silver rate"/></label></div><button className="outline-btn" disabled={busy}><RefreshCw size={14}/> Save rates</button></form>
        <div className="admin-list"><h3>Products ({products.length})</h3>{products.map(p=><div className="admin-product" key={p.id}><div className="admin-thumb">{p.images?.[0]?<img src={p.images[0]} alt=""/>:<Gem size={20}/>}</div><div className="admin-product-name"><b>{p.name}</b><small>{money(p.price)} · {p.category} · {p.is_published?'Published':'Hidden'}</small></div><button title={p.is_published?'Hide':'Publish'} onClick={()=>togglePublish(p)}>{p.is_published?<EyeOff size={17}/>:<Eye size={17}/>}</button><button title="Edit" onClick={()=>startEdit(p)}><Pencil size={17}/></button><button title="Delete" onClick={()=>deleteProduct(p)}><Trash2 size={17}/></button></div>)}</div>
      </div>}
      {notice && <p className="notice">{notice}</p>}
    </div></div>}
  </div>
}
export default App
