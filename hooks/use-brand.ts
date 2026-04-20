'use client'

import { useState, useEffect } from 'react'
import { getBrand, DEFAULT_BRAND, type BrandConfig } from '@/lib/store'

// Convert a hex color string to oklch string for CSS variables.
// We use a simple approximation via HSL->oklch mapping that works
// well enough for the brand color range. The key insight is that
// the CSS custom properties in globals.css use oklch(), so we need
// to patch the <style> tag instead of setting oklch vars directly.
// The simplest correct approach: inject a <style> override with
// CSS variables using the raw hex value via color-mix.

function hexToOklchApprox(hex: string): string {
  // Strip #
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255

  // sRGB → linear
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const lr = toLinear(r); const lg = toLinear(g); const lb = toLinear(b)

  // linear sRGB → XYZ D65
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb

  // XYZ → OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z)
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z)
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  const C = Math.sqrt(a * a + bOk * bOk)
  const H = (Math.atan2(bOk, a) * 180) / Math.PI

  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${((H % 360) + 360) % 360 .toFixed(2)})`
}

const STYLE_ID = 'hitungin-brand-override'

function applyBrandCSS(brand: BrandConfig) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  const primary = hexToOklchApprox(brand.primaryColor)
  const accent  = hexToOklchApprox(brand.accentColor)
  el.textContent = `
    :root {
      --primary: ${primary};
      --accent:  ${accent};
      --sidebar: oklch(0.18 0.04 ${(parseFloat(brand.primaryColor.slice(1), 16) & 0xff) > 128 ? '255' : '220'});
      --sidebar-primary: ${primary};
    }
  `
}

export function useBrand(): BrandConfig {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND)

  useEffect(() => {
    const load = () => {
      const b = getBrand()
      setBrand(b)
      applyBrandCSS(b)
    }
    load()
    window.addEventListener('hitungin:brand-updated', load)
    return () => window.removeEventListener('hitungin:brand-updated', load)
  }, [])

  return brand
}
