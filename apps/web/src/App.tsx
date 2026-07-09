import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useSubmittedSpots } from './hooks/useSubmittedSpots'
import { useVisited } from './hooks/useVisited'
import { IDEAS } from './data/ideas'
import { ACCOMMODATIONS } from './data/accommodations'
import { PLACES_TAB_IDS, PLACES_TABS, PLAN_TAB_IDS, PLAN_TABS, type TabId } from './tabs'
import type { MapFocus } from './mapFocus'
import { Header } from './components/Header'
import { TabNav } from './components/TabNav'
import { MobileNav } from './components/MobileNav'
import { SeigaihaBand } from './components/Seigaiha'
import { OfflineBanner } from './components/OfflineBanner'
import { UpdateToast } from './components/UpdateToast'
import { LoginScreen } from './components/LoginScreen'
import { ItineraryPage } from './components/itinerary/ItineraryPage'
import { PackingPage } from './components/packing/PackingPage'
import { JournalPage } from './components/journal/JournalPage'
import { ReferencePage } from './components/reference/ReferencePage'
import { MapView } from './components/MapView'
import { IdeasList } from './components/IdeasList'
import { RestaurantsList } from './components/RestaurantsList'
import { AttractionsList } from './components/AttractionsList'
import { AnimalCafesList } from './components/AnimalCafesList'
import { FullDataList } from './components/FullDataList'
import { SubmitForm } from './components/SubmitForm'
import { SegmentedTabs } from './components/SegmentedTabs'

export default function App() {
  const auth = useAuth()
  const { restaurants, attractions, animalCafes, submit } = useSubmittedSpots(auth.state)
  const visited = useVisited(auth.state)

  const [activeTab, setActiveTab] = useState<TabId>('itinerary')
  const [lastPlacesTab, setLastPlacesTab] = useState<TabId>('restaurants')
  const [lastPlanTab, setLastPlanTab] = useState<TabId>('itinerary')
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null)

  function selectTab(id: TabId) {
    setActiveTab(id)
    if (PLACES_TAB_IDS.includes(id)) setLastPlacesTab(id)
    if (PLAN_TAB_IDS.includes(id)) setLastPlanTab(id)
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
  const isPlan = PLAN_TAB_IDS.includes(activeTab)

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <Header auth={auth.state} onSignOut={auth.signOut} />
      <OfflineBanner />
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

        {isPlan && (
          <>
            <SegmentedTabs tabs={PLAN_TABS} active={activeTab} onSelect={selectTab} />
            {activeTab === 'itinerary' && <ItineraryPage auth={auth.state} />}
            {activeTab === 'packing' && <PackingPage auth={auth.state} />}
            {activeTab === 'journal' && <JournalPage auth={auth.state} />}
            {activeTab === 'reference' && <ReferencePage />}
          </>
        )}

        {activeTab === 'ideas' && <IdeasList onSeeOnMap={seeOnMap} visited={visited} />}

        {isPlaces && (
          <>
            <SegmentedTabs tabs={PLACES_TABS} active={activeTab} onSelect={selectTab} />
            {activeTab === 'restaurants' && (
              <RestaurantsList entries={restaurants} onSeeOnMap={seeOnMap} visited={visited} />
            )}
            {activeTab === 'attractions' && (
              <AttractionsList entries={attractions} onSeeOnMap={seeOnMap} visited={visited} />
            )}
            {activeTab === 'animalCafes' && (
              <AnimalCafesList entries={animalCafes} onSeeOnMap={seeOnMap} visited={visited} />
            )}
            {activeTab === 'fullData' && (
              <FullDataList
                restaurants={restaurants}
                attractions={attractions}
                animalCafes={animalCafes}
                onSeeOnMap={seeOnMap}
                visited={visited}
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

      <MobileNav
        active={activeTab}
        planTarget={lastPlanTab}
        placesTarget={lastPlacesTab}
        onSelect={selectTab}
      />
      <UpdateToast />
    </div>
  )
}
