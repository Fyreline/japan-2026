import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useSubmittedSpots } from './hooks/useSubmittedSpots'
import { IDEAS } from './data/ideas'
import { ACCOMMODATIONS } from './data/accommodations'
import { PLACES_TAB_IDS, type TabId } from './tabs'
import type { MapFocus } from './mapFocus'
import { Header } from './components/Header'
import { TabNav } from './components/TabNav'
import { MobileNav } from './components/MobileNav'
import { SeigaihaBand } from './components/Seigaiha'
import { LoginScreen } from './components/LoginScreen'
import { ItineraryPage } from './components/itinerary/ItineraryPage'
import { MapView } from './components/MapView'
import { IdeasList } from './components/IdeasList'
import { RestaurantsList } from './components/RestaurantsList'
import { AttractionsList } from './components/AttractionsList'
import { AnimalCafesList } from './components/AnimalCafesList'
import { FullDataList } from './components/FullDataList'
import { SubmitForm } from './components/SubmitForm'
import { PlacesSegmented } from './components/PlacesSegmented'

export default function App() {
  const auth = useAuth()
  const { restaurants, attractions, animalCafes, submit } = useSubmittedSpots(auth.state)

  const [activeTab, setActiveTab] = useState<TabId>('itinerary')
  const [lastPlacesTab, setLastPlacesTab] = useState<TabId>('restaurants')
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null)

  function selectTab(id: TabId) {
    setActiveTab(id)
    if (PLACES_TAB_IDS.includes(id)) setLastPlacesTab(id)
  }

  function seeOnMap(focus: MapFocus) {
    setMapFocus(focus)
    setActiveTab('map')
  }

  // Gate: loading renders nothing but the paper background (no flash of gate
  // or content, ARCHITECTURE.md §5).
  if (auth.state.status === 'loading') {
    return <div className="h-full bg-paper" />
  }
  if (auth.state.status === 'signedOut') {
    return <LoginScreen onSignIn={auth.signIn} />
  }

  const isPlaces = PLACES_TAB_IDS.includes(activeTab)

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <Header auth={auth.state} onSignOut={auth.signOut} />
      <TabNav active={activeTab} onSelect={selectTab} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">
        {/* Map stays mounted so Leaflet keeps its state; shown via `hidden`. */}
        <div className={activeTab === 'map' ? '' : 'hidden'}>
          <MapView
            accommodations={ACCOMMODATIONS}
            ideas={IDEAS}
            restaurants={restaurants}
            attractions={attractions}
            animalCafes={animalCafes}
            focus={mapFocus}
            active={activeTab === 'map'}
          />
        </div>

        {activeTab === 'itinerary' && <ItineraryPage auth={auth.state} />}
        {activeTab === 'ideas' && <IdeasList onSeeOnMap={seeOnMap} />}

        {isPlaces && (
          <>
            <PlacesSegmented active={activeTab} onSelect={selectTab} />
            {activeTab === 'restaurants' && (
              <RestaurantsList entries={restaurants} onSeeOnMap={seeOnMap} />
            )}
            {activeTab === 'attractions' && (
              <AttractionsList entries={attractions} onSeeOnMap={seeOnMap} />
            )}
            {activeTab === 'animalCafes' && (
              <AnimalCafesList entries={animalCafes} onSeeOnMap={seeOnMap} />
            )}
            {activeTab === 'fullData' && (
              <FullDataList
                restaurants={restaurants}
                attractions={attractions}
                animalCafes={animalCafes}
                onSeeOnMap={seeOnMap}
              />
            )}
          </>
        )}

        {activeTab === 'submit' && <SubmitForm onSubmit={submit} />}
      </main>

      <footer className="mt-auto">
        <SeigaihaBand />
        <div className="border-t border-line px-4 py-4 text-center md:px-8">
          <p className="font-mono text-[11px] text-ink-soft">
            Japan 2026 · 20 SEP – 3 OCT · just the two of you
          </p>
        </div>
      </footer>

      <MobileNav active={activeTab} placesTarget={lastPlacesTab} onSelect={selectTab} />
    </div>
  )
}
