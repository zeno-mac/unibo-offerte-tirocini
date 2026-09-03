import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import json

LISTING_PATH = "gestioneaziendeconautocandidature.htm"
BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"


def setup_payload():
    return {"data":
            {
                "denominazioneAzienda": "",
                "provincia": "351",
                "parolaChiave": "",
                "nazione": "",
                "settoreAttivita": "35",
                "_flagConvenzioneTPVPsicologia": "on",
                "cerca": "Search",
                "form_submit": "true",
            },
            }


def setup_cookies():
    load_dotenv()
    return {"JSESSIONID": os.getenv('JSESSIONID')}


def fetch_listing_page(url, cookies, payload, page_num=1):
    return requests.post(url+"?page="+str(page_num), cookies=cookies, data=payload)


def fetch_company_page(url, cookies):
    return requests.get(url=url, cookies=cookies)


def extract_companies(page, base_url):
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [{"name": row.td.a.p.get_text(strip=True), "url": base_url+row.td.a["href"]} for row in rows]


def extract_company_info(page):
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find("table", class_="tbSimpleData")
    list = {}
    for row in table.find_all("tr"):
        name = row.find("td", class_="formLabelNew")
        value = row.find("td", class_="value")
        if name and value:
            list[name.string] = value.string
    return list


def main():
    payload = setup_payload()
    cookies = setup_cookies()
    page = fetch_listing_page(
        url=BASE__URL+LISTING_PATH, cookies=cookies, payload=payload)
    companies = extract_companies(page.content, BASE__URL)
    for item in companies:
        company_page = fetch_company_page(
            item["url"], cookies=cookies)
        item["info"] = extract_company_info(company_page.content)
    with open("log.json", "w") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
