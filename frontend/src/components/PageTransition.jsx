import { useState, useEffect, useRef } from 'react'

export default function PageTransition({ tabKey, children }) {
  const [display, setDisplay]   = useState(children)
  const [phase,   setPhase]     = useState('idle') // idle | exit | enter
  const prevKey = useRef(tabKey)

  useEffect(() => {
    if (tabKey === prevKey.current) return
    prevKey.current = tabKey
    setPhase('exit')
    const t1 = setTimeout(() => {
      setDisplay(children)
      setPhase('enter')
    }, 150)
    const t2 = setTimeout(() => setPhase('idle'), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [tabKey])

  useEffect(() => {
    if (phase === 'idle') setDisplay(children)
  }, [children])

  const cls =
    phase === 'exit'  ? 'page-exit page-exit-active' :
    phase === 'enter' ? 'page-enter page-enter-active' : ''

  return <div className={cls}>{display}</div>
}
