from pathlib import Path
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'tmp' / 'pdfs'
sys.path.insert(0, str(WORK / 'deps'))
from fontTools.ttLib import TTFont as FontToolsFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.graphics.shapes import Drawing, Polygon
from reportlab.graphics.svgpath import SvgPath
from reportlab.graphics import renderPDF
from PIL import Image
from pypdf import PdfReader

FONTDIR = WORK / 'fonts'
FONTDIR.mkdir(parents=True, exist_ok=True)
OUTDIR = ROOT / 'output' / 'pdf'
OUTDIR.mkdir(parents=True, exist_ok=True)
OUT = OUTDIR / 'first-medical-associates-brand-kit.pdf'

web_fonts = {
    'Inter': '83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2',
    'Manrope': 'a343f882a40d2cc9-s.p.1sj6eobyi31rd.woff2',
    'Geist': 'caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2',
}
libre = FONTDIR / 'LibreBaskerville-variable.ttf'
if not libre.exists():
    urllib.request.urlretrieve(
        'https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf', libre)

def register(family, weight):
    dest = FONTDIR / f'{family}-{weight}.ttf'
    source = libre if family == 'LibreBaskerville' else ROOT / '.next/static/media' / web_fonts[family]
    f = FontToolsFont(source)
    f = instantiateVariableFont(f, {'wght': weight}, inplace=True)
    f.flavor = None
    # Give static instances unique names so PDF font caching preserves each weight.
    for record in f['name'].names:
        if record.nameID in (1, 2, 4, 6, 16, 17):
            value = str(weight) if record.nameID in (2,17) else f'{family}-{weight}'
            record.string = value.encode(record.getEncoding())
    f.save(dest)
    name = f'{family}-{weight}'
    pdfmetrics.registerFont(TTFont(name, str(dest)))
    return name

IR = register('Inter', 400)
IM = register('Inter', 500)
IS = register('Inter', 600)
MB = register('Manrope', 700)
ME = register('Manrope', 800)
GR = register('Geist', 400)
GB = register('Geist', 700)
LR = register('LibreBaskerville', 400)

W, H = 612, 792
M = 36
CW = W - 2*M
NAVY = '#001689'
BLUE = '#4298CC'
WEBNAVY = '#0D2C72'
WEBBLUE = '#1D5FA8'
TEAL = '#19ABC5'
INK = '#18212F'
MUTED = '#5F6B7E'
MIST = '#F7FAFD'
LINE = '#DAE3EC'
WHITE = '#FFFFFF'

c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle('First Medical Associates | Brand Kit')
c.setAuthor('First Medical Associates')
c.setSubject('Single-page reference: logo, brand colors, website palette and typography')
c.setCreator('First Medical Associates Brand Kit')

def box(x, top, width, height, fill, stroke=None, radius=0):
    c.setFillColor(HexColor(fill))
    c.setStrokeColor(HexColor(stroke or fill))
    c.setLineWidth(.6)
    if radius:
        c.roundRect(x, H-top-height, width, height, radius, fill=1, stroke=bool(stroke))
    else:
        c.rect(x, H-top-height, width, height, fill=1, stroke=bool(stroke))

def text(x, baseline_top, s, size=9, font=IR, color=INK, tracking=None):
    c.saveState()
    c.setFillColor(HexColor(color))
    c.setFont(font, size)
    if tracking is None:
        c.drawString(x, H-baseline_top, s)
    else:
        t = c.beginText(x, H-baseline_top)
        t.setFont(font, size)
        t.setCharSpace(tracking)
        t.textLine(s)
        c.drawText(t)
    c.restoreState()

def right(x, baseline_top, s, size=9, font=IR, color=INK):
    c.saveState()
    c.setFillColor(HexColor(color))
    c.setFont(font,size)
    c.drawRightString(x,H-baseline_top,s)
    c.restoreState()

def rule(top, x=M, width=CW):
    c.setStrokeColor(HexColor(LINE))
    c.setLineWidth(.6)
    c.line(x,H-top,x+width,H-top)

def section(top, number, label):
    text(M,top,number,8,IS,BLUE,1)
    text(M+25,top,label,12,MB,WEBNAVY)

def rgb(h):
    return ' / '.join(str(int(h[i:i+2],16)) for i in (1,3,5))

def icon(x, top, size):
    source = ET.parse(ROOT/'public/uploads/FMAicon.svg').getroot()
    drawing = Drawing(1080,1080)
    for el in source.iter():
        tag = el.tag.split('}')[-1]
        if tag == 'path':
            drawing.add(SvgPath(el.attrib['d'], fillColor=HexColor(BLUE),strokeColor=None))
        if tag == 'polygon':
            points = [float(v) for v in el.attrib['points'].replace(',',' ').split()]
            drawing.add(Polygon(points, fillColor=HexColor(NAVY),strokeColor=None))
    c.saveState()
    c.translate(x,H-top)
    c.scale(size/1080,-size/1080)
    renderPDF.draw(drawing,c,0,0)
    c.restoreState()

# Opening panel uses the exact white logo asset from the website.
box(0,0,W,180,WEBNAVY)
box(0,177,W,3,TEAL)
text(M,32,'VISUAL IDENTITY',8,IS,WHITE,1.8)
right(W-M,32,'SEPTEMBER 2026',7.5,IM,'#FFFFFF')
logo = ROOT/'public/logo-white.png'
im = Image.open(logo)
lw = 350
lh = lw*im.height/im.width
c.drawImage(str(logo),M,H-55-lh,width=lw,height=lh,mask='auto')
text(428,97,'Brand kit',22,MB,WHITE)
text(429,119,'Logo / Color / Type',8,IR,WHITE)
c.linkURL('https://drsfirst.com',(M,H-170,390,H-45),relative=0,thickness=0)

# Logo colors are sourced from the full-color SVG, not sampled visually.
section(209,'01','Logo & brand colors')
icon(M,228,75)
text(125,241,'Full-color mark',9,IS,INK)
text(125,260,'Use the supplied artwork.',8.0,IR,MUTED)
text(125,273,'Preserve its proportions',8.0,IR,MUTED)
text(125,286,'and surrounding space.',8.0,IR,MUTED)
text(M,321,'White logo above: for dark backgrounds.',7.5,IR,MUTED)

for x, name, color in [(302,'FMA Navy',NAVY),(446,'FMA Blue',BLUE)]:
    box(x,228,130,48,color)
    text(x,291,name,9.3,IS,INK)
    text(x,305,color,8.5,IM,WEBNAVY)
    text(x,319,'RGB '+rgb(color),7.2,IR,MUTED)
rule(337)

# A concise palette of the website's homepage tokens.
section(361,'02','Website palette')
right(W-M,361,'HEX + RGB',7.2,IM,MUTED)
palette = [
    ('Deep navy',WEBNAVY,'Primary'),
    ('Web blue',WEBBLUE,'Supporting'),
    ('Teal',TEAL,'Accent'),
    ('Ink',INK,'Text'),
    ('Mist',MIST,'Background'),
    ('White',WHITE,'Surface'),
]
gap=9
sw=(CW-gap*5)/6
for i,(name,color,role) in enumerate(palette):
    x=M+i*(sw+gap)
    box(x,380,sw,45,color,LINE if i>=4 else None)
    text(x,440,name,8.5,IS,INK)
    text(x,454,color,8.2,IM,WEBNAVY)
    text(x,467,rgb(color),6.7,IR,MUTED)
    text(x,481,role,7.2,IR,MUTED)
rule(497)

# Embedded font specimens; the site uses different families by page role.
section(521,'03','Typography')
colx=[M,321]
text(M,544,'LOGO WORDMARK',7,IS,MUTED,1.1)
text(M,572,'Libre Baskerville',19,LR,WEBNAVY)
text(M,593,'Aa Bb Cc 0123456789',12,LR,INK)
text(M,611,'Logo typeface supplied by the brand.',8,IR,MUTED)

text(colx[1],544,'HOMEPAGE HEADINGS',7,IS,MUTED,1.1)
text(colx[1],572,'Manrope',25,ME,WEBNAVY)
text(colx[1],593,'First Medical Associates',12,MB,INK)
text(colx[1],611,'Bold 700 / ExtraBold 800',8,IR,MUTED)

rule(627,M,255)
rule(627,colx[1],255)
text(M,649,'BODY & INTERFACE',7,IS,MUTED,1.1)
text(M,677,'Inter',25,IS,WEBNAVY)
text(M,698,'Patient-centered care, close to home.',10,IR,INK)
text(M,716,'Regular 400 / Medium 500 / Semibold 600',7.5,IR,MUTED)

text(colx[1],649,'INDIVIDUAL LOCATION PAGES',7,IS,MUTED,1.1)
text(colx[1],677,'Geist',25,GB,WEBNAVY)
text(colx[1],698,'Find care in your community.',10,GR,INK)
text(colx[1],716,'Additional website family',8,IR,MUTED)

rule(740)
text(M,756,'Source: website logo assets and styles; logo typeface confirmed by client.',6.8,IR,MUTED)
text(M,769,'Core reference palette. Individual pages include additional shades and fallback fonts.',6.5,IR,MUTED)
right(W-M,769,'drsfirst.com',8,IS,WEBNAVY)
c.linkURL('https://drsfirst.com',(505,H-773,576,H-755),relative=0,thickness=0)
c.showPage()
c.save()

reader=PdfReader(str(OUT))
assert len(reader.pages)==1
content=reader.pages[0].extract_text()
for required in ['Libre Baskerville','Manrope','Inter','Geist',NAVY,BLUE,WEBNAVY,TEAL]:
    assert required in content, required
fonts=reader.pages[0]['/Resources']['/Font']
embedded=[]
for obj in fonts.values():
    f=obj.get_object()
    if '/FontDescriptor' in f:
        desc=f['/FontDescriptor'].get_object()
        embedded.append({'name':str(f.get('/BaseFont')),'embedded':'/FontFile2' in desc or '/FontFile3' in desc})
assert len(embedded)>=7 and all(x['embedded'] for x in embedded)
print(json.dumps({'output':str(OUT),'pages':1,'bytes':OUT.stat().st_size,'fonts':embedded},indent=2))
