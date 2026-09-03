import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os

main_page_url = "https://tirocini.unibo.it/tirocini/studenti/gestioneaziendeconautocandidature.htm?page="

def setup_payload():
    return {"data" : 
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
    return {"JSESSIONID" : os.getenv('JSESSIONID')}
                
        
def send_post_req(url, cookies, index, payload):
    return requests.post(url+str(index),headers="",cookies=cookies,data=payload)


def main():
    payload = setup_payload()
    cookies = setup_cookies()
    rows = []
    for i in range(1,8):
        res = send_post_req(url=main_page_url,cookies= cookies, payload=payload, index=i)
        soup = BeautifulSoup(res.content, "html.parser")
        table =  soup.find('table', class_ = "iceDataTblOutline")
        rows += table.find_all('tr', class_="rigaPari")
        rows += table.find_all('tr', class_="rigaDispari")
    

    list = []
    for row in rows:
        list.append((row.td.a["href"]))
    for item in list:
        print(item)
    print(f"Numero oggetti: {len(list)}")
    
    
if __name__ == "__main__":
    main()
    

    
    