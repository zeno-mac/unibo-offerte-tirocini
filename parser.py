from bs4 import BeautifulSoup
from typing import Optional
import re


class IncorrectHTMLlayout(Exception):
    def __init__(self, target):
        super().__init__(f"Error during html parsing: {target}")


def extract_companies(page: bytes, base_url: str) -> Optional[list[dict]]:
    """Input: page (bytes/str, HTML della pagina di elenco), base_url (str).
    Output: list of dict {'name': str, 'url': str}, or None if table is not present."""
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    if table is None:
        raise IncorrectHTMLlayout("table class=iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [{"name": row.td.a.p.get_text(strip=True), "url": re.sub(r"page=\d+&", "", base_url+row.td.a["href"])} for row in rows]


def extract_company_info(page: bytes, url: str) -> Optional[dict]:
    """Input: page (bytes/str, HTML of the company page), url (str).
    Output: dict {field: value} with "Offer url",
    or None if table is not present."""
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
