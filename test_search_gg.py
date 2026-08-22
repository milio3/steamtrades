import requests
from bs4 import BeautifulSoup
from backend.price_service import BROWSER_HEADERS

s = requests.Session()
s.headers.update(BROWSER_HEADERS)
r = s.get('https://gg.deals/games/?title=Getting%20Over%20It%20with%20Bennett%20Foddy')
soup = BeautifulSoup(r.text, 'html.parser')
for a in soup.select('a[href*="/game/"]'):
    print(a.get('href'), '->', a.get_text(strip=True)[:50])
