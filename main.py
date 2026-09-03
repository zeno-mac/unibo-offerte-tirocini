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


def send_post_req(url, cookies, payload, page_num=1):
    return requests.post(url+"?page="+str(page_num), cookies=cookies, data=payload)


def send_get_req(url, cookies):
    return requests.get(url=url, cookies=cookies)


def parse_links(page, base_url):
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [base_url+row.td.a["href"] for row in rows]


def parse_company_page(page):
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
    p = send_post_req(BASE__URL+LISTING_PATH, cookies=cookies,
                      payload=payload, page_num=1)
    links = parse_links(p.content, BASE__URL)
    list = []
    for link in links:
        page = send_get_req(url=link, cookies=cookies)
        list.append(parse_company_page(page.content))

    with open("log.json", "w") as f:
        json.dump(list, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
