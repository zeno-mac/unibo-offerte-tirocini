import re
import requests
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv

def login():
    url = "https://tirocini.unibo.it/tirocini/studenti/homePageStudenti.htm"

    session = requests.Session()
    res = session.get(url=url)
    
    new_url = res.url + "&RedirectToIdentityProvider=AD AUTHORITY"
    res1 = session.get(new_url)
    
    soup = BeautifulSoup(res1.text, "html.parser")
    r =soup.find("form", id="options")

    load_dotenv()

    new_url = r["action"]
    payload = {"UserName":os.getenv('UNIBO_MAIL'),
               "Password":os.getenv('UNIBO_PASSWORD')}
    
    headers = {"User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:155.0) Gecko/20100101 Firefox/155.0"}
    res2 = session.post(new_url, data=payload,headers=headers)
    
    soup = BeautifulSoup(res2.text.replace("name", "id"), "html.parser")
    action = soup.find("form")["action"]
    saml_res =soup.find("input",id="SAMLResponse")["value"]
    relay =soup.find("input", id="RelayState")["value"]
    
    resF = session.post(action, data={"RelayState":relay, "SAMLResponse":saml_res})
    
    return session.cookies["JSESSIONID"]