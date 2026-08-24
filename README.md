# Gothic Remake Save Explorer

Nieoficjalny, lokalny eksplorator zapisów dla **Gothic 1 Remake**. Automatycznie wykrywa katalog zapisów, wyciąga z nich możliwie pełny obraz stanu gry i pokazuje go w czytelnym, dwujęzycznym (PL/EN) interfejsie — bez modyfikowania oryginalnych plików. Osobny tryb edytora pozwala świadomie zmieniać dane, ale zawsze na kopii, dokładanej jako nowy slot zapisu.

Projekt nie jest afiliowany z Alkimia Interactive ani THQ Nordic.

## Eksplorator

- automatyczne wykrywanie `%LOCALAPPDATA%\G1R\Saved\SaveGames`, ręczna zmiana katalogu, monitoring zmian w czasie rzeczywistym,
- widoki **listy i kafelków** dla zapisów, ekwipunku, NPC i kompendium,
- profile, rozdział, mapa, poziom trudności, czas gry, autentyczne SHA-1 i miniatury zapisów,
- atrybuty postaci (odkrywane generycznie z zapisu, nie tylko lista podstawowa), pozycja w świecie z najbliższą lokacją,
- pełny ekwipunek, umiejętności, aktywne/ukończone zadania wraz z opisami,
- pełna lista NPC świata z relacją, stanem zdrowia i ekwipunkiem, lista handlarzy z ich stokiem,
- przestępstwa i reputacja wobec frakcji, kompendium (bestiariusz i lokacje),
- dziennik zdarzeń pamięci i wiedzy dialogowej postaci, stan fabuły i flagi scenariusza,
- tryb zaawansowany — generyczne przeszukiwanie surowych właściwości zapisu,
- **Statystyki**: wykres poziomu i czasu gry w czasie, reputacja frakcji, porównywarka dwóch zapisów (co się zmieniło),
- eksport danych do JSON/CSV — appka nigdy nie kopiuje plików zapisu, jedyną drogą wyjścia jest eksport.

## Tryb edytora

Osobna sekcja aplikacji do świadomej edycji zapisu: atrybuty, teleportacja (wyszukiwarka miejsc), ekwipunek (zmiana ilości, dodawanie, usuwanie), umiejętności, stan zadań, relacje z NPC (w tym wskrzeszanie), stok handlarzy, wybaczanie przestępstw frakcjom, rozdział fabuły, oraz tryb zaawansowany do edycji dowolnej surowej właściwości zapisu.

Każda zmiana trafia do kolejki, a zapis odbywa się dopiero po kliknięciu „Zapisz jako nowy zapis”:

1. edycje zapisywane są do tymczasowej kopii — oryginalny plik nigdy nie jest otwierany do zapisu,
2. kopia jest niezależnie zwalidowana (pełny odczyt zwrotny),
3. dopiero wtedy zostaje dołożona jako nowy, osobny slot `G1R-XXX.sav` w katalogu zapisów wybranego profilu.

## Nazwy po polsku

Nazwy przedmiotów, NPC, questów i lokacji są tłumaczone przez łańcuch źródeł: jeśli gra jest zainstalowana lokalnie, aplikacja odczytuje jej własny (zaszyfrowany) plik lokalizacji i pokazuje autentyczny polski tekst; w innym wypadku korzysta z bundlowanego słownika angielskiego, a na końcu z uczłowieczonego identyfikatora. Interfejs (przyciski, nagłówki) ma osobny przełącznik PL/EN w Ustawieniach.

## Bezpieczeństwo

Tryb eksploratora otwiera pliki gry wyłącznie do odczytu i nigdy ich nie kopiuje ani nie nadpisuje — jedyną drogą wyjścia danych jest jawny eksport JSON/CSV. Renderer Electron działa z `contextIsolation`, bez dostępu do Node.js; operacje plikowe przechodzą przez wąski preload API, a każda ścieżka pliku jest weryfikowana względem wybranego katalogu zapisów.

Tryb edytora nigdy nie modyfikuje oryginalnego pliku — pracuje na tymczasowej kopii, którą niezależnie waliduje przed dołożeniem jako nowy slot. Aplikacja nie czyta pamięci procesu gry.

## Licencja

[MIT](LICENSE)
