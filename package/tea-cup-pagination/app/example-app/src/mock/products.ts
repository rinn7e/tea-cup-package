export type Category =
  | 'electronics'
  | 'audio'
  | 'photography'
  | 'gaming'
  | 'wearables'

export type CategoryTab = 'all' | Category

export type Product = {
  id: string
  title: string
  category: Category
  price: number
  rating: number
  stock: number
  description: string
  isFavorite: boolean
  badge?: string
}

export const INITIAL_PRODUCTS: Product[] = [
  // Electronics
  {
    id: 'prod-01',
    title: 'UltraSlim OLED Laptop 14"',
    category: 'electronics',
    price: 1299,
    rating: 4.8,
    stock: 15,
    description:
      'Next-gen 2.8K OLED 120Hz display with AI-accelerated processor and 18-hour battery life.',
    isFavorite: false,
    badge: 'Popular',
  },
  {
    id: 'prod-02',
    title: 'ProStand Aluminum Hub',
    category: 'electronics',
    price: 89,
    rating: 4.5,
    stock: 42,
    description:
      '10-in-1 dual 4K HDMI docking stand engineered from aerospace-grade CNC aluminum.',
    isFavorite: true,
  },
  {
    id: 'prod-03',
    title: 'MagCharge 3-in-1 Station',
    category: 'electronics',
    price: 119,
    rating: 4.7,
    stock: 28,
    description:
      'Fast wireless charging dock for phone, smartwatch, and earbuds with magnetic alignment.',
    isFavorite: false,
    badge: 'New',
  },
  {
    id: 'prod-04',
    title: 'Precision Stylus Pen Gen 2',
    category: 'electronics',
    price: 69,
    rating: 4.3,
    stock: 55,
    description:
      '4096 levels of pressure sensitivity with ultra-low latency and tilt detection.',
    isFavorite: false,
  },
  {
    id: 'prod-05',
    title: 'ThunderSpeed 2TB NVMe SSD',
    category: 'electronics',
    price: 189,
    rating: 4.9,
    stock: 20,
    description:
      'Blazing fast 7450 MB/s read speeds with integrated graphene heatsink.',
    isFavorite: false,
    badge: 'Best Seller',
  },
  {
    id: 'prod-06',
    title: 'Smart LED Desk Bar',
    category: 'electronics',
    price: 49,
    rating: 4.6,
    stock: 35,
    description:
      'Asymmetric optical design with auto-dimming and ambient color temperature sensor.',
    isFavorite: false,
  },
  {
    id: 'prod-07',
    title: 'Dual-Band Mesh WiFi 7 Router',
    category: 'electronics',
    price: 249,
    rating: 4.7,
    stock: 12,
    description:
      'Ultra-low latency mesh coverage up to 6,000 sq ft with Multi-Link Operation (MLO).',
    isFavorite: false,
  },
  {
    id: 'prod-08',
    title: 'Ergonomic Vertical Mouse Pro',
    category: 'electronics',
    price: 79,
    rating: 4.4,
    stock: 30,
    description:
      '57-degree natural handshake angle reduces forearm strain by 35%.',
    isFavorite: false,
  },
  {
    id: 'prod-09',
    title: 'UltraWide 34" Curved Monitor',
    category: 'electronics',
    price: 649,
    rating: 4.8,
    stock: 8,
    description:
      '144Hz WQHD IPS curved screen with 98% DCI-P3 color gamut and 90W USB-C PD.',
    isFavorite: true,
    badge: 'Featured',
  },

  // Audio
  {
    id: 'prod-10',
    title: 'AcousticPure Noise Canceling Studio',
    category: 'audio',
    price: 349,
    rating: 4.9,
    stock: 18,
    description:
      'Custom 40mm beryllium drivers with hybrid active noise cancellation and spatial audio.',
    isFavorite: true,
    badge: 'Award Winner',
  },
  {
    id: 'prod-11',
    title: 'SoundWave Hi-Res Desktop DAC',
    category: 'audio',
    price: 159,
    rating: 4.7,
    stock: 22,
    description:
      'Dual ES9038Q2M DAC architecture supporting 32-bit/768kHz PCM and DSD512.',
    isFavorite: false,
  },
  {
    id: 'prod-12',
    title: 'PocketGroove Waterproof Speaker',
    category: 'audio',
    price: 59,
    rating: 4.5,
    stock: 60,
    description:
      'IP67 dust and waterproof with punchy 360-degree sound and 14-hour playtime.',
    isFavorite: false,
  },
  {
    id: 'prod-13',
    title: 'TrueTone In-Ear Monitors (IEM)',
    category: 'audio',
    price: 199,
    rating: 4.8,
    stock: 14,
    description:
      'Planar magnetic driver coupled with balanced armature for immaculate vocal clarity.',
    isFavorite: false,
    badge: 'Audiophile',
  },
  {
    id: 'prod-14',
    title: 'Broadcast Studio Condenser Mic',
    category: 'audio',
    price: 149,
    rating: 4.6,
    stock: 25,
    description:
      'Cardioid polar pattern with internal pop filter and zero-latency headphone monitor.',
    isFavorite: false,
  },
  {
    id: 'prod-15',
    title: 'SonicPulse Wireless Earbuds Pro',
    category: 'audio',
    price: 179,
    rating: 4.7,
    stock: 32,
    description:
      'Adaptive ANC with transparency mode, multipoint Bluetooth 5.4, and wireless charging.',
    isFavorite: false,
  },
  {
    id: 'prod-16',
    title: 'Retro Tube Headphone Amplifier',
    category: 'audio',
    price: 289,
    rating: 4.9,
    stock: 6,
    description:
      'Warm, harmonic tube analog sound with selectable impedance and balanced XLR output.',
    isFavorite: true,
  },
  {
    id: 'prod-17',
    title: 'SurroundSound Dolby Atmos Bar',
    category: 'audio',
    price: 499,
    rating: 4.6,
    stock: 10,
    description:
      '5.1.2 channel immersive home theater soundbar with wireless subwoofer.',
    isFavorite: false,
  },

  // Photography
  {
    id: 'prod-18',
    title: 'Lumix Alpha Full-Frame Body',
    category: 'photography',
    price: 1899,
    rating: 4.9,
    stock: 5,
    description:
      '45MP back-illuminated sensor with 8K RAW video and 5-axis in-body image stabilization.',
    isFavorite: true,
    badge: 'Flagship',
  },
  {
    id: 'prod-19',
    title: 'Apex Prime 50mm f/1.2 Lens',
    category: 'photography',
    price: 899,
    rating: 4.8,
    stock: 9,
    description:
      'Ultra-fast aperture portrait lens with buttery bokeh and silent linear autofocus motors.',
    isFavorite: false,
  },
  {
    id: 'prod-20',
    title: 'CarbonFiber Travel Tripod',
    category: 'photography',
    price: 219,
    rating: 4.7,
    stock: 24,
    description:
      'Weighs only 1.2kg, supports 15kg payload, with 360-degree precision fluid ball head.',
    isFavorite: false,
  },
  {
    id: 'prod-21',
    title: 'StudioSoft RGB LED Panel',
    category: 'photography',
    price: 129,
    rating: 4.6,
    stock: 30,
    description:
      'Full RGB 2500K-10000K continuous video light with CRI 97+ and wireless app control.',
    isFavorite: false,
  },
  {
    id: 'prod-22',
    title: 'CineGimbal 3-Axis Stabilizer',
    category: 'photography',
    price: 379,
    rating: 4.8,
    stock: 11,
    description:
      'Titan stabilization algorithm with automated tracking and motorized focus dial.',
    isFavorite: false,
    badge: 'Pro Choice',
  },
  {
    id: 'prod-23',
    title: 'Variable ND2-ND400 Filter 77mm',
    category: 'photography',
    price: 79,
    rating: 4.4,
    stock: 40,
    description:
      'Multi-coated German optical glass with zero X-cross vignetting.',
    isFavorite: false,
  },
  {
    id: 'prod-24',
    title: 'Rugged Weatherproof Camera Bag',
    category: 'photography',
    price: 169,
    rating: 4.7,
    stock: 19,
    description:
      'Customizable divider system with quick side access and rainproof tarpaulin shell.',
    isFavorite: false,
  },
  {
    id: 'prod-25',
    title: 'Pocket 4K Drone with Gimbal',
    category: 'photography',
    price: 499,
    rating: 4.8,
    stock: 13,
    description:
      'Under 249g lightweight drone with 3-axis mechanical gimbal and 31-minute flight time.',
    isFavorite: true,
  },

  // Gaming
  {
    id: 'prod-26',
    title: 'Tactile Mech RGB Keyboard 75%',
    category: 'gaming',
    price: 159,
    rating: 4.8,
    stock: 27,
    description:
      'Hot-swappable pre-lubed linear switches, gasket mounted with sound-dampening foam.',
    isFavorite: true,
    badge: 'Hot',
  },
  {
    id: 'prod-27',
    title: 'HyperGlide 49g Wireless Mouse',
    category: 'gaming',
    price: 99,
    rating: 4.7,
    stock: 35,
    description:
      'Flawless 32,000 DPI optical sensor with 8,000Hz polling rate and zero smoothing.',
    isFavorite: false,
  },
  {
    id: 'prod-28',
    title: 'OLED 240Hz 27" Gaming Display',
    category: 'gaming',
    price: 799,
    rating: 4.9,
    stock: 7,
    description:
      '0.03ms response time with 99% DCI-P3, G-Sync compatible, and pure inky blacks.',
    isFavorite: false,
    badge: 'Elite',
  },
  {
    id: 'prod-29',
    title: 'Spatial Audio 7.1 Gaming Headset',
    category: 'gaming',
    price: 129,
    rating: 4.5,
    stock: 22,
    description:
      '50mm neodymium drivers with memory foam ear cushions and detachable broadcast mic.',
    isFavorite: false,
  },
  {
    id: 'prod-30',
    title: 'Modular Hall-Effect Controller',
    category: 'gaming',
    price: 119,
    rating: 4.7,
    stock: 16,
    description:
      'Drift-free electromagnetic joysticks and triggers with customizable back paddles.',
    isFavorite: false,
  },
  {
    id: 'prod-31',
    title: 'SpeedSurface XL Cordura Deskmat',
    category: 'gaming',
    price: 35,
    rating: 4.6,
    stock: 50,
    description:
      'Water-repellent Cordura fabric with anti-fray micro-stitched edges and non-slip base.',
    isFavorite: false,
  },
  {
    id: 'prod-32',
    title: 'StreamDeck Macro Command Console',
    category: 'gaming',
    price: 149,
    rating: 4.8,
    stock: 18,
    description:
      '15 customizable LCD keys for instant scene switching, audio mixing, and macros.',
    isFavorite: false,
  },
  {
    id: 'prod-33',
    title: 'Ergonomic Mesh Gaming Chair',
    category: 'gaming',
    price: 399,
    rating: 4.6,
    stock: 9,
    description:
      'Breathable dual-mesh backrest with 4D armrests and self-adjusting lumbar support.',
    isFavorite: false,
  },

  // Wearables
  {
    id: 'prod-34',
    title: 'Apex Titan Smartwatch Ultra',
    category: 'wearables',
    price: 449,
    rating: 4.9,
    stock: 12,
    description:
      'Grade 5 titanium casing with dual-frequency GPS, sapphire crystal, and 100m water resistance.',
    isFavorite: true,
    badge: 'Popular',
  },
  {
    id: 'prod-35',
    title: 'BioRing Health & Sleep Tracker',
    category: 'wearables',
    price: 299,
    rating: 4.7,
    stock: 20,
    description:
      'Sub-millimeter biometric ring measuring HRV, body temperature, and continuous SpO2.',
    isFavorite: false,
    badge: 'Trending',
  },
  {
    id: 'prod-36',
    title: 'Smart Audio Frames (Polarized)',
    category: 'wearables',
    price: 189,
    rating: 4.4,
    stock: 26,
    description:
      'Open-ear acoustic speakers built into UV400 polarized classic sunglasses frames.',
    isFavorite: false,
  },
  {
    id: 'prod-37',
    title: 'Sport Band Pulse Strap',
    category: 'wearables',
    price: 49,
    rating: 4.6,
    stock: 45,
    description:
      'Dual ANT+ and Bluetooth chest strap heart rate monitor with ECG-grade accuracy.',
    isFavorite: false,
  },
  {
    id: 'prod-38',
    title: 'AeroPulse Fitness Tracker Band',
    category: 'wearables',
    price: 69,
    rating: 4.3,
    stock: 38,
    description:
      'Lightweight 18g swim-proof band with 14-day battery life and AMOLED display.',
    isFavorite: false,
  },
  {
    id: 'prod-39',
    title: 'Breathable Milanese Loop 22mm',
    category: 'wearables',
    price: 29,
    rating: 4.5,
    stock: 70,
    description:
      'Woven stainless steel mesh with fully magnetic infinitely adjustable clasp.',
    isFavorite: false,
  },
  {
    id: 'prod-40',
    title: 'Smart Heated Winter Gloves',
    category: 'wearables',
    price: 99,
    rating: 4.5,
    stock: 15,
    description:
      'Carbon fiber heating elements with touchscreen-compatible fingertips and 3 heat settings.',
    isFavorite: false,
  },

  // Additional cross-category items to ensure nice round numbers & pagination coverage
  {
    id: 'prod-41',
    title: 'ProGrade 8K HDMI 2.1 Cable (2m)',
    category: 'electronics',
    price: 25,
    rating: 4.8,
    stock: 80,
    description:
      '48Gbps ultra high speed cable supporting 4K@120Hz and 8K@60Hz with eARC.',
    isFavorite: false,
  },
  {
    id: 'prod-42',
    title: 'Compact 65W GaN Fast Charger',
    category: 'electronics',
    price: 39,
    rating: 4.7,
    stock: 65,
    description: 'Gallium Nitride dual USB-C + USB-A foldable travel plug.',
    isFavorite: false,
  },
  {
    id: 'prod-43',
    title: 'Acoustic Sound Isolation Foam Kit',
    category: 'audio',
    price: 45,
    rating: 4.2,
    stock: 33,
    description: '12-pack high-density studio wedge acoustic treatment panels.',
    isFavorite: false,
  },
  {
    id: 'prod-44',
    title: 'Wireless Bluetooth Lavalier Mic',
    category: 'audio',
    price: 89,
    rating: 4.6,
    stock: 28,
    description:
      'Compact clip-on transmitter and receiver with DSP noise reduction.',
    isFavorite: false,
  },
  {
    id: 'prod-45',
    title: 'Lens Cleaning & Sensor Kit',
    category: 'photography',
    price: 29,
    rating: 4.5,
    stock: 50,
    description:
      'Air blower, carbon lens pen, microfiber cloths, and sensor swabs.',
    isFavorite: false,
  },
  {
    id: 'prod-46',
    title: 'Quick-Release Camera Wrist Strap',
    category: 'photography',
    price: 35,
    rating: 4.8,
    stock: 40,
    description: 'Dyneema-cord anchor system supporting over 90kg of gear.',
    isFavorite: false,
  },
  {
    id: 'prod-47',
    title: 'Custom Coiled Aviator Cable',
    category: 'gaming',
    price: 29,
    rating: 4.4,
    stock: 35,
    description:
      'Braided double-sleeved USB-C cable with detachable 4-pin aviator connector.',
    isFavorite: false,
  },
  {
    id: 'prod-48',
    title: 'Titanium Magnetic Bracelet Band',
    category: 'wearables',
    price: 59,
    rating: 4.6,
    stock: 25,
    description:
      'DLC coated lightweight titanium link bracelet with quick adjust.',
    isFavorite: false,
  },
]

export type SortBy = 'price_asc' | 'price_desc' | 'rating_desc' | 'title_asc'

// ─── In-Memory Database ─────────────────────────────────────────────
class InMemoryProductDatabase {
  private products: Product[] = [...INITIAL_PRODUCTS]

  public reset(): void {
    this.products = [...INITIAL_PRODUCTS]
  }

  public getAll(): Product[] {
    return [...this.products]
  }

  public getById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id)
  }

  public delete(id: string): boolean {
    const initialLen = this.products.length
    this.products = this.products.filter((p) => p.id !== id)
    return this.products.length < initialLen
  }

  public toggleFavorite(id: string): Product | undefined {
    const product = this.products.find((p) => p.id === id)
    if (!product) return undefined
    product.isFavorite = !product.isFavorite
    return { ...product }
  }

  public setFavorite(id: string, isFavorite: boolean): Product | undefined {
    const product = this.products.find((p) => p.id === id)
    if (!product) return undefined
    product.isFavorite = isFavorite
    return { ...product }
  }

  public query(options: {
    category?: string
    searchQuery?: string
    sortBy?: SortBy
    offset: number
    limit: number
  }): { items: Product[]; totalCount: number } {
    let filtered = [...this.products]

    if (options.category && options.category !== 'all') {
      filtered = filtered.filter((p) => p.category === options.category)
    }

    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    }

    if (options.sortBy) {
      switch (options.sortBy) {
        case 'price_asc':
          filtered.sort((a, b) => a.price - b.price)
          break
        case 'price_desc':
          filtered.sort((a, b) => b.price - a.price)
          break
        case 'rating_desc':
          filtered.sort((a, b) => b.rating - a.rating)
          break
        case 'title_asc':
          filtered.sort((a, b) => a.title.localeCompare(b.title))
          break
      }
    }

    const totalCount = filtered.length
    const items = filtered.slice(options.offset, options.offset + options.limit)
    return { items, totalCount }
  }

  public getCategoryCounts(): Record<CategoryTab, number> {
    const counts: Record<CategoryTab, number> = {
      all: this.products.length,
      electronics: 0,
      audio: 0,
      photography: 0,
      gaming: 0,
      wearables: 0,
    }
    for (const p of this.products) {
      counts[p.category]++
    }
    return counts
  }
}

export const db = new InMemoryProductDatabase()
