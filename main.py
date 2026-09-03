import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os

main_page_url = "https://tirocini.unibo.it/tirocini/studenti/gestioneaziendeconautocandidature.htm?page="


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


def send_post_req(url, cookies, page_num, payload):
    return requests.post(url+str(page_num), headers="", cookies=cookies, data=payload)


def parse_links(page):
    rows = []
    soup = BeautifulSoup(page.content, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [row.td.a["href"] for row in rows]


def main():
    payload = setup_payload()
    cookies = setup_cookies()
    p = send_post_req(main_page_url, cookies=cookies,
                      payload=payload, page_num=1)
    links = parse_links(p)
    for item in links:
        print(item)


if __name__ == "__main__":
    main()
