# Profile-aware discovery — research and implementation decision

Date: 2026-08-24

## Decision

Travel Swipe now reuses the taste profile for three additional intents:

- hotels;
- organized, multi-day trips;
- a short free-form search.

The stored experience and restaurant profiles remain separate. For these new
discovery intents, the backend averages only signals that already exist across
the two profiles. Trip party, age band, duration and budget are optional,
request-scoped filters. They are not written into the lasting profile.

Occupation and relationship status should not be default profile fields. They
are sensitive, poor proxies for travel taste, and create more collection and
explanation burden than recommendation value. `travel party` expresses the
useful context without turning a situational choice into a personal label.

## Performance and provider compliance

Google Places Text Search can return an official `websiteUri` and a
`googleMapsUri`. The website is now the primary direct action on a Places card,
with Maps as a separate action. Hotel/lodging place types are supported by the
Places taxonomy.

Google's Places policies prohibit general prefetching, caching, or storage of
Places content outside documented exceptions. Therefore Travel Swipe does not
prepare or persist a second Google Places payload. It runs independent Places
queries in a bounded parallel fan-out, reducing total wait without violating
that restriction.

Brave Search's standard terms also restrict storage unless the subscribed plan
grants it. Persistent SQLite caching is therefore off by default. Brave-backed
results use only short-lived process memory, and a one-use next selection is
prepared after every successful response. It expires after three minutes and
is consumed by token. This gives a near-instant `find more` path while avoiding
a durable provider-result database.

Primary sources:

- Google Places Text Search and field masks: <https://developers.google.com/maps/documentation/places/web-service/text-search>
- Google Places types: <https://developers.google.com/maps/documentation/places/web-service/place-types>
- Google Maps Platform policies: <https://developers.google.com/maps/documentation/places/web-service/policies>
- Brave Search API: <https://brave.com/search/api/>
- Brave Search API terms: <https://api-dashboard.search.brave.com/terms-of-service>

## Hotels

The current beta is discovery, not a booking engine. Google Places gives
structured properties, coordinates, ratings, Maps links and official websites,
but not contractual live room availability or a total stay price. The UI must
not claim otherwise.

For production booking, integrate one supplier after commercial approval:

1. Booking.com Demand API: real-time availability/prices, property content and
   redirect URLs; requires partner credentials.
2. Expedia Rapid Lodging: property content, geography, rates and availability,
   with a booking path for approved partners.

Sources:

- Booking.com Demand API availability: <https://developers.booking.com/demand/docs/accommodations/search-for-available-properties>
- Booking.com accommodation API overview: <https://developers.booking.com/demand/docs/accommodations/about-accommodation>
- Expedia Rapid Lodging: <https://developers.expediagroup.com/rapid/lodging>

## Organized trips

The beta uses profile-weighted web queries plus explicit trip context. It is a
useful discovery prototype, but result freshness, departure dates, spaces and
final prices cannot be guaranteed from general web results.

Recommended production sequence:

1. TourRadar Distribution API for organized multi-day trips. Its inventory and
   API are directly aligned with departures, operators, structured search,
   affiliate redirection and, at higher integration levels, booking.
2. Viator Partner API for bookable day tours and activities. It supports
   product content, schedules, availability, traveler pricing and booking or
   affiliate models.

Sources:

- TourRadar Distribution API: <https://www.tourradar.com/distribution-api>
- TourRadar partner solutions: <https://www.tourradar.com/partner-solutions>
- Viator Partner API: <https://docs.viator.com/partner-api/>

## Privacy guardrails

Keep personalization understandable and minimal:

- collect only fields that materially improve the current search;
- explain why each field is used;
- keep optional trip context out of the permanent profile;
- provide deletion/export controls before account sync or analytics expansion;
- never infer protected or sensitive traits from swipes.

This follows GDPR purpose limitation, data minimization, storage limitation,
transparency, and privacy-by-design principles.

Sources:

- European Commission GDPR principles: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/overview-principles/what-data-can-we-process-and-under-which-conditions_en>
- EDPB SME compliance guide: <https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en>

## Next implementation steps

1. Measure time-to-first-results and time-to-next-results in privacy-preserving,
   opt-in product analytics.
2. Track explicit result feedback (useful, not relevant, visited, closed) as
   ranking labels rather than assuming link clicks equal satisfaction.
3. Add an approved hotel inventory provider and show total price, cancellation
   terms and availability only from that provider.
4. Add TourRadar search/content in an affiliate beta, then test whether
   structured departure filters outperform general web discovery.
5. Add account sync only after consent, retention, deletion and data export are
   designed; keep local-only mode available.
