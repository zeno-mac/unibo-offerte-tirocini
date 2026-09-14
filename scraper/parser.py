from bs4 import BeautifulSoup
import re


class IncorrectHTMLlayout(Exception):
    def __init__(self, target):
        super().__init__(f"Error during html parsing: {target}")


def extract_extracurricular_offer_links(page: bytes, base_url: str) -> list[str]:
    """Input: page (bytes/str, HTML of a listing page), base_url (str).
    Output: list of url : str, one per company row, with
    the 'page=N&' query param stripped from each URL.
    Raises IncorrectHTMLlayout if the results table is missing."""
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    if table is None:
        raise IncorrectHTMLlayout("table class=iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [re.sub(r"page=\d+&", "", base_url+row.td.a["href"]) for row in rows]


def extract_extracurricular_offer(page: bytes, url: str) -> dict:
    """Input: page (bytes/str, HTML of a company page), url (str).
    Output: dict {field label: value} scraped from the detail table, plus
    "Indirizzo dell'offerta:" set to url.
    Raises IncorrectHTMLlayout if the detail table is missing."""
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find("table", class_="tbSimpleData")
    dict = {
        "Indirizzo dell'offerta:": url
    }
    if table is None:
        raise IncorrectHTMLlayout("table class=tbSimpleData")
    for row in table.find_all("tr"):
        name = row.find("td", class_="formLabelNew")
        value = row.find("td", class_="value")
        if name and value:
            dict[name.get_text(strip=True)] = value.get_text(
                separator=" ", strip=True)
    return dict


def extract_max_pages(page):
    """Input: page (bytes/str, HTML of a listing page). Output: int, the
    total number of listing pages read from the "Pagina X/Y" pager text.
    Raises IncorrectHTMLlayout if the pager cell or its text is missing."""
    soup = BeautifulSoup(page, "html.parser")
    td = soup.find("td", class_="icePnlGrdColumn2")
    if td is None:
        raise IncorrectHTMLlayout("td class=icePnlGrdColumn2")
    match = re.search(r"Pagina\s+\d+/(\d+)", td.get_text())
    if match is None:
        print("[WARNING] No max_page found, defaulting to 1...")
        return 1
    return int(match.group(1))
