# Informacje o komponentach zewnętrznych

**Gothic Remake Save Explorer** korzysta z dwóch niezależnych, nieoficjalnych projektów społecznościowych poświęconych Gothic 1 Remake. Żaden z nich nie jest afiliowany z Alkimia Interactive ani THQ Nordic.

## GORE / goresave

- repozytorium: https://github.com/dh0er/gore
- autor: Daniel Hoer
- użyta wersja: 1.3.0
- licencja: MIT
- copyright (c) 2026 goresave contributors

Aplikacja zawiera bibliotekę `gore_save.dll` z tego projektu — używaną wyłącznie do lokalnego, tylko-do-odczytu rozpakowania i interpretacji plików zapisów (oraz, w trybie edytora, do zapisu kopii zapisu poprzez natywne API biblioteki) wskazanych przez użytkownika. Pełny tekst licencji MIT oraz zestawienie licencji zależności biblioteki są instalowane w katalogu `resources/goresave` jako `LICENSE` i `THIRD_PARTY_LICENSES.md`.

Z tego samego projektu (katalog `apps/save-editor/assets` w jego repozytorium) pochodzą bundlowane słowniki `item_catalog.json`, `npc_catalog.json`, `location_catalog.json`, `knowledge_catalog.json`, `glossary_npc_catalog.json` i `glossary_segment_text_catalog.json`, wykorzystywane do kategoryzacji przedmiotów, postaci i lokacji odczytanych z zapisu.

## Gothic 1 Remake — Savegame Editor

- repozytorium: https://github.com/Xetoxyc/gothic-remake-savegame-editor
- autor: Tobias Sittenauer
- licencja: MIT

Z tego projektu pochodzi bundlowany plik `g1r_editor_localization.json` (angielskie i niemieckie nazwy przedmiotów, umiejętności, questów i NPC), używany jako zapasowe źródło nazw, gdy gra nie jest zainstalowana lokalnie. Podejście do bezpiecznej edycji i ponownego zapisu pliku zapisu (walidacja przed nadpisaniem, praca na kopii) było też punktem odniesienia przy projektowaniu trybu edytora tej aplikacji.

## Lokalizacja gry

Gdy Gothic 1 Remake jest zainstalowany lokalnie, aplikacja może opcjonalnie odczytać własny, zaszyfrowany plik lokalizacji gry (`AlkimiaLocalization_00000000.lcache`), aby pokazać autentyczne, wielojęzyczne (w tym polskie) nazwy przedmiotów, NPC, questów i lokacji zamiast angielskich odpowiedników. Format i klucz odszyfrowujący zostały udokumentowane przez projekt GORE (patrz wyżej) — dane samej gry pozostają własnością Alkimia Interactive / THQ Nordic i nie są rozpowszechniane wraz z tą aplikacją; plik jest czytany wyłącznie na komputerze użytkownika, tylko do odczytu.
