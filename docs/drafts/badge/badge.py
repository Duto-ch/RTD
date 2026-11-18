# 속성 아이콘 + 레벨 바 시안 (캐릭터 앞, 탑뷰 필드 칸 위). 아트 1px = 게임 2px
import math
from PIL import Image, ImageDraw, ImageFont
R='/home/user/rtd/docs/drafts/roster-art/sheets/'
OUT=(0x2b,0x1d,0x2f)
def hx(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))
ATTR={ # 진함, 기본, 밝음
 'red':  [hx('#9c2622'),hx('#e0533f'),hx('#ffb347')],
 'blue': [hx('#1f4380'),hx('#3a7fe0'),hx('#9fd4ff')],
 'green':[hx('#1f6a34'),hx('#45a83f'),hx('#b8ec7a')]}
GOLD=[hx('#9a6a14'),hx('#f5c542'),hx('#fff2a0')]
GRADE={1:hx('#8a6a4a'),2:hx('#c8ccd4'),3:hx('#7ad0e8'),4:hx('#f5c542')}   # 커먼 나무 · 언커먼 은 · 레어 하늘 · 유니크 금
WHITE=(255,255,255); EMPTY=hx('#4a4052')
ICON={
 'red':["..o.o..",".obo.o.",".obbobo","obcbbbo","obcwcbo","obccbbo",".obcbo.","..ooo.."],      # 불꽃
 'blue':["...o...","..obo..",".obbbo.","obcbbbo","obwbbbo","obcbbbo",".obbbo.","..ooo.."],    # 물방울
 'green':["...ooo.","..obbbo",".obbcbo","obbcbbo","obcbbo.","occbo..",".ooo...","o......"]}   # 잎
def icon(d,x,y,attr,mono=None):
    a=ATTR[attr]; cm={'o':OUT,'b':a[1],'c':a[2],'w':WHITE}
    if mono: cm={'o':OUT,'b':mono,'c':mono,'w':mono}
    for j,row in enumerate(ICON[attr]):
        for i,ch in enumerate(row):
            if ch!='.': d.point((x+i,y+j),fill=cm[ch])
def bar_segments(d,x,y,lv,attr,seg_w=2,seg_h=3,gap=1,frame=OUT):
    n=5; w=n*seg_w+(n-1)*gap+2; h=seg_h+2
    d.rectangle([x,y,x+w-1,y+h-1],fill=frame)
    col=GOLD if lv==5 else ATTR[attr]
    for k in range(n):
        sx=x+1+k*(seg_w+gap)
        if k<lv: d.rectangle([sx,y+1,sx+seg_w-1,y+seg_h],fill=col[1]); d.line([sx,y+1,sx+seg_w-1,y+1],fill=col[2])
        else: d.rectangle([sx,y+1,sx+seg_w-1,y+seg_h],fill=EMPTY)
    return w
# ── 시안 ──
def A(d,cx,cy,attr,lv,grade):   # 아이콘 + 5칸 바, 발밑 가운데
    y=cy+5; x=cx-12
    icon(d,x,y,attr); bar_segments(d,x+8,y+2,lv,attr,seg_w=2,seg_h=3)
def B(d,cx,cy,attr,lv,grade):   # 등급색 테두리 알약 띠 안에 흰 아이콘 + 레벨 점 5개
    x0,y0,x1,y1=cx-11,cy+6,cx+10,cy+12; a=ATTR[attr]
    d.rounded_rectangle([x0,y0,x1,y1],radius=3,fill=a[0],outline=GRADE[grade])
    d.rounded_rectangle([x0-1,y0-1,x1+1,y1+1],radius=4,outline=OUT)
    # 미니 아이콘 5x5 (흰색)
    mini={'red':["w..w.","w.ww.","wwwww","wwwww",".www."],'blue':["..w..",".www.","wwwww","wwwww",".www."],'green':["..www",".wwww","wwww.","www..","w...."]}[attr]
    for j,row in enumerate(mini):
        for i,ch in enumerate(row):
            if ch=='w': d.point((x0+2+i,y0+1+j),fill=WHITE)
    for k in range(5):
        px=x0+9+k*2+k; col=(GOLD[1] if lv==5 else WHITE) if k<lv else a[1]
        d.rectangle([px,y0+3,px+1,y0+4],fill=col)
def C(d,cx,cy,attr,lv,grade,part='all'):   # 탑뷰 바닥 링: 발밑 원을 5조각으로 나눠 레벨만큼 채움 + 앞쪽에 아이콘
    rx,ry=12,6; col=GOLD if lv==5 else ATTR[attr]; ccy=cy+7
    for t in range(360):
        a=math.radians(t); k=int(((t+90)%360)/72)            # 아래(앞)에서 시작, 시계 방향 5조각
        if (t+90)%72<6: continue                              # 조각 사이 틈
        if part=='back' and math.sin(a)>0: continue
        if part=='front' and math.sin(a)<=0: continue
        x=cx+math.cos(a)*rx; y=ccy+math.sin(a)*ry
        c=col[1] if k<lv else EMPTY
        d.rectangle([round(x),round(y),round(x),round(y)+1],fill=c)
    if part!='back': icon(d,cx-3,ccy+2,attr)
def D(d,cx,cy,attr,lv,grade):   # 방패 엠블럼(등급색 테두리) 오른쪽 아래 + 세로 5칸 바
    x=cx+3; y=cy-1; a=ATTR[attr]
    sh=["ooooooooo","oggggggo","ogbbbbbgo","ogbbbbbgo","ogbbbbbgo",".ogbbbgo.","..ogbgo..","...ogo...","....o...."]
    sh=["ooooooooo","ogggggggo","ogbbbbbgo","ogbbbbbgo","ogbbbbbgo",".ogbbbgo.","..ogbgo..","...ogo...","....o...."]
    for j,row in enumerate(sh):
        for i,ch in enumerate(row):
            if ch!='.': d.point((x+i,y+j),fill={'o':OUT,'g':GRADE[grade],'b':a[0]}[ch])
    mini={'red':[".w.",".ww","www","ww."],'blue':[".w.","www","www",".w."],'green':["..w",".ww","ww.","w.."]}[attr]
    for j,row in enumerate(mini):
        for i,ch in enumerate(row):
            if ch=='w': d.point((x+3+i,y+2+j),fill=WHITE)
    col=GOLD if lv==5 else a
    d.rectangle([x-1,y+9,x+9,y+12],fill=OUT)                 # 방패 아래 5칸 눈금
    for k in range(5):
        px=x+k*2
        d.rectangle([px,y+10,px,y+11],fill=col[1] if k<lv else EMPTY)
        if k<lv: d.point((px,y+10),fill=col[2])
DIG={'1':[".w.","ww.",".w.",".w.","www"],'2':["ww.","..w",".w.","w..","www"],'3':["ww.","..w",".w.","..w","ww."],'4':["w.w","w.w","www","..w","..w"],'5':["www","w..","ww.","..w","ww."]}
def E(d,cx,cy,attr,lv,grade):   # 작은 이름표: 아이콘 + 레벨 숫자 (테두리 = 등급색, Lv5 금색 숫자)
    x0,y0=cx-8,cy+5; a=ATTR[attr]
    d.rounded_rectangle([x0,y0,x0+16,y0+9],radius=2,fill=OUT)
    d.rounded_rectangle([x0+1,y0+1,x0+15,y0+8],radius=2,fill=a[0],outline=GRADE[grade])
    icon(d,x0+1,y0+1,attr)
    tx=x0+10
    d.text((0,0),'')
    for j,row in enumerate(DIG[str(lv)]):
        for i,ch in enumerate(row):
            if ch=='w': d.point((tx+i,y0+2+j),fill=GOLD[1] if lv==5 else WHITE)
VARS=[('A','아이콘 + 5칸 바 (발밑 가운데)',A),('B','속성색 알약 띠 + 흰 아이콘 + 레벨 점 (테두리 = 등급색)',B),
      ('C','탑뷰 바닥 링 5조각 + 앞쪽 아이콘',C),('D','방패 엠블럼(테두리 = 등급색) + 아래 5칸 눈금, 오른쪽 아래',D),('E','작은 이름표: 아이콘 + 레벨 숫자 (테두리 = 등급색, Lv5 금색)',E)]
CH=[('kaira','red',1,2),('elin','green',3,2),('winston','blue',5,3),('verona','red',4,3)]
def tile_bg(w,h,ox,oy,T=24):
    bg=Image.new('RGBA',(w,h)); d=ImageDraw.Draw(bg)
    for ty in range(-1,h//T+2):
        for tx in range(-1,w//T+2):
            x=ox+tx*T; y=oy+ty*T
            d.rectangle([x,y,x+T-1,y+T-1],fill='#696e7a' if (tx+ty)%2 else '#adafb7'); d.line([x,y,x+T,y],fill='#454953'); d.line([x,y,x,y+T],fill='#454953')
    return bg
font=ImageFont.truetype('../fonts/merged_sunflower_700.ttf',24); small=ImageFont.truetype('../fonts/merged_sunflower_500.ttf',17)
def scene(fn):   # 칸 4개 (캐릭터 4명), 아트 좌표
    W,H=4*24,34; img=tile_bg(W,H,0,-2); d=ImageDraw.Draw(img)
    for i,(cid,attr,lv,gr) in enumerate(CH):
        cx=i*24+12; cy=10   # 칸 중심
        fr=Image.open(R+cid+'.png').convert('RGBA').crop((0,0,56,40))
        if fn is C: C(d,cx,cy,attr,lv,gr,'back')
        img.alpha_composite(fr,(cx-27,cy-23)) if cx-27>=0 else img.paste(fr.crop((27-cx,0,56,40)),(0,cy-23),fr.crop((27-cx,0,56,40)))
        fn(d,cx,cy,attr,lv,gr,'front') if fn is C else fn(d,cx,cy,attr,lv,gr)
    return img
rows=[(k,t,scene(f)) for k,t,f in VARS]
Z=4; G=2   # 확대 보기 / 게임 크기
sw=96*Z
W=40+sw+40+96*G+40; H=70+sum(r[2].size[1]*Z+70 for r in rows)
sh=Image.new('RGBA',(W,H),'#f3eedf'); d=ImageDraw.Draw(sh)
d.text((40,14),'크게 보기 (×4)',fill='#4a3a28',font=font); d.text((40+sw+40,14),'게임 크기 (2px)',fill='#4a3a28',font=font)
y=60
for k,t,img in rows:
    d.text((40,y),f'{k}  {t}',fill='#4a3a28',font=small); y+=30
    big=img.resize((img.size[0]*Z,img.size[1]*Z),Image.NEAREST); sh.paste(big,(40,y))
    sh.paste(img.resize((img.size[0]*G,img.size[1]*G),Image.NEAREST),(40+sw+40,y))
    y+=big.size[1]+40
sh.save('badge-drafts.png'); print(sh.size)
