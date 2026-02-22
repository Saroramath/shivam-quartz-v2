import L from "leaflet"

// Load Leaflet CSS dynamically (can't use @import in concatenated SCSS)
function loadLeafletCSS() {
  if (document.getElementById("leaflet-css")) return
  const link = document.createElement("link")
  link.id = "leaflet-css"
  link.rel = "stylesheet"
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  document.head.appendChild(link)
}

// Marker icon fix for bundled Leaflet (default icon paths break with bundlers)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface LocationData {
  title: string
  slug: string
  lat: number
  lng: number
  image: string | null
  date: string | null
}

function buildPopupContent(loc: LocationData): string {
  const imgHtml = loc.image
    ? `<div class="map-preview-img"><img src="/${loc.image}" alt="${loc.title}" loading="lazy" /></div>`
    : ""
  const dateHtml = loc.date ? `<div class="map-preview-date">${loc.date}</div>` : ""
  return `<a href="/${loc.slug}" class="map-preview-card internal" data-slug="${loc.slug}">
    ${imgHtml}
    <div class="map-preview-info">
      <div class="map-preview-title">${loc.title}</div>
      ${dateHtml}
    </div>
  </a>`
}

function renderMap(container: HTMLElement) {
  const raw = container.getAttribute("data-locations")
  if (!raw) return

  const locations: LocationData[] = JSON.parse(raw)
  if (locations.length === 0) return

  loadLeafletCSS()

  // Clear any existing map instance
  container.innerHTML = ""

  const map = L.map(container, {
    scrollWheelZoom: false,
  })

  // OpenStreetMap tiles (free, no API key)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map)

  // Add markers with hover previews
  const markers: L.Marker[] = []
  for (const loc of locations) {
    const marker = L.marker([loc.lat, loc.lng], { icon: defaultIcon }).addTo(map)

    const popup = L.popup({
      closeButton: false,
      className: "map-preview-popup",
      maxWidth: 220,
      minWidth: 180,
    }).setContent(buildPopupContent(loc))

    marker.bindPopup(popup)

    // Show on hover
    marker.on("mouseover", () => {
      marker.openPopup()
    })
    marker.on("mouseout", (e: L.LeafletMouseEvent) => {
      // Don't close if mouse moved into the popup itself
      const popupEl = popup.getElement()
      if (popupEl) {
        const related = (e.originalEvent as MouseEvent).relatedTarget as Node | null
        if (popupEl.contains(related)) return
      }
      marker.closePopup()
    })

    // Click navigates to the page
    marker.on("click", () => {
      window.location.href = `/${loc.slug}`
    })

    markers.push(marker)
  }

  // Keep popup open when hovering over it
  container.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement
    if (target.closest(".map-preview-popup")) {
      // popup is being hovered, keep it open
    }
  })
  container.addEventListener("mouseout", (e) => {
    const target = e.target as HTMLElement
    const related = (e as MouseEvent).relatedTarget as Node | null
    const popup = target.closest(".map-preview-popup")
    if (popup && related && !popup.contains(related)) {
      // Mouse left the popup and didn't go back to marker
      map.closePopup()
    }
  })

  // Fit map to show all markers with padding
  if (markers.length > 0) {
    const group = L.featureGroup(markers)
    map.fitBounds(group.getBounds().pad(0.15))
  }

  // Enable scroll zoom after first click on map
  map.once("click", () => {
    map.scrollWheelZoom.enable()
  })

  // Handle popup link clicks for SPA navigation
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement
    const link = target.closest("a.map-preview-card") as HTMLAnchorElement | null
    if (link) {
      e.preventDefault()
      const href = link.getAttribute("href")
      if (href) {
        window.location.href = href
      }
    }
  })

  return map
}

document.addEventListener("nav", () => {
  const container = document.getElementById("travel-map")
  if (!container) return

  const mapInstance = renderMap(container)

  if (mapInstance) {
    window.addCleanup(() => {
      mapInstance.remove()
    })
  }
})
