# 탑뷰 셀 카툰 이펙트 4종 (16비트 RGB555 5색, 외곽선 1px, 그라데이션·반투명 없음)
import json, math, random, os
from PIL import Image, ImageDraw
TD=__import__('os').environ.get('TD','sheets'); os.makedirs(TD, exist_ok=True)
SQ = 0.82                                   # 위에서 본 바닥 원 (세로 살짝 눌림)
def snap(v): return round(v*31/255)*255//31
def pal(l): return [tuple(snap(int(c[i:i+2],16)) for i in (1,3,5)) for c in l]
FIRE = pal(['#9c2622','#d8432f','#f58a3a','#ffd25a','#fff8d0'])    # 외곽선·그림자·기본·밝음·하이라이트
MET  = pal(['#3b2f52','#6a5f8a','#d8432f','#ffa23f','#fff2a0'])
LEAF = pal(['#2a6a34','#4f9a45','#8fd86a','#e8ffb0','#ffffff'])
import os as _o; OUTLINE_MODE=_o.environ.get('OL','selout')      # 'dark' = 근흑색 1px · 'selout' = 계열색 테두리 · 'none' = 없음
RIM={}                     # 색 → 그 색 계열의 테두리 색 (셀아웃)
for c in FIRE: RIM[c]=FIRE[0]
for c in MET[2:]: RIM[c]=MET[2]
RIM[MET[2]]=MET[2]
for c in MET[:2]: RIM[c]=MET[0]
for c in LEAF: RIM[c]=LEAF[0]
def outline(img, dark):
    if OUTLINE_MODE=='none': return img
    W,H=img.size; p=img.load(); o=img.copy(); op=o.load()
    for y in range(H):
        for x in range(W):
            if p[x,y][3]: continue
            nb=[p[x+dx,y+dy] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<W and 0<=y+dy<H and p[x+dx,y+dy][3]]
            if not nb: continue
            if OUTLINE_MODE=='dark': op[x,y]=dark+(255,)
            else: op[x,y]=RIM.get(nb[0][:3],nb[0][:3])+(255,)
    return o
def polar(cx,cy,x,y):
    dx=x-cx; dy=(y-cy)/SQ; return math.hypot(dx,dy), math.atan2(dy,dx)
def save(name, imgs, ms, ax, ay, loop=False):
    w,h=imgs[0].size; sh=Image.new('RGBA',(w*len(imgs),h))
    for i,g in enumerate(imgs): sh.paste(g,(i*w,0))
    sh.save(f'{TD}/{name}.png')
    json.dump({'frames':[{'frame':{'x':i*w,'y':0,'w':w,'h':h},'pivot':{'x':ax/w,'y':ay/h},'duration':m} for i,m in enumerate(ms)],'loop':loop},open(f'{TD}/{name}.json','w'))
    cols=set()
    for g in imgs: cols|={c[:3] for c in g.getdata() if c[3]}
    print(name,len(imgs),'frames',w,'x',h,'colours',len(cols))

# ── 1. 화염 고리: 바깥을 향한 불꽃 혀가 달린 띠가 사방으로 퍼짐 ──
def ring():
    W,H=88,76; cx,cy=44,38; out=[]
    R=[5,10,15,20,24,28,31,33,35]; Wd=[6,7,7,6,6,5,4,3,2]
    for f,(r,w) in enumerate(zip(R,Wd)):
        g=Image.new('RGBA',(W,H)); p=g.load(); ph=f*0.35
        for y in range(H):
            for x in range(W):
                d,a=polar(cx,cy,x,y)
                tongue=3.2*max(0,math.cos(9*a+ph))**3 if f<7 else 0
                inner=r-w; outer=r+tongue
                if not (inner<=d<=outer): continue
                if f>=6 and math.sin(7*a+f)>0.55-0.25*(f-6): continue      # 끝에서 조각나며 사라짐
                t=(d-inner)/max(1,outer-inner)
                c = FIRE[4] if t<0.22 and f<5 else FIRE[3] if t<0.5 else FIRE[2] if t<0.8 or d<r else FIRE[1]
                if f>=5: c = FIRE[2] if t<0.5 else FIRE[1]
                p[x,y]=c+(255,)
        out.append(outline(g,FIRE[0]))
    save('ring',out,[50,50,55,60,60,70,80,90,100],cx,cy)


def spin():
    W,H=80,72; cx,cy=40,36; R=19; out=[]; ms=[]
    heads=[-100,-30,40,110,180,250,320,380,420,440]          # 칼끝 각도(도)
    lens =[30,90,150,200,230,240,220,160,90,30]               # 궤적 길이(도)
    for f,(h,L) in enumerate(zip(heads,lens)):
        g=Image.new('RGBA',(W,H)); p=g.load(); d=ImageDraw.Draw(g); hr=math.radians(h)
        for y in range(H):
            for x in range(W):
                dd,a=polar(cx,cy,x,y)
                delta=math.degrees((hr-a)%(2*math.pi))
                if delta>L: continue
                u=delta/max(L,1)                                   # 0 = 칼끝, 1 = 꼬리
                w=7.5*(1-u)**0.8+1.2
                inner=R-w*0.35; outer=R+w*0.65
                if f>=8 and int(delta/18)%2: continue              # 끝에서 끊어짐
                if not inner<=dd<=outer: continue
                t=(dd-inner)/max(0.1,outer-inner)                  # 0 안쪽 날 ~ 1 바깥 불꽃
                if u<0.12: c=FIRE[4]
                elif t<0.35 and u<0.5: c=FIRE[4] if u<0.3 else FIRE[3]
                elif u<0.4: c=FIRE[3]
                elif u<0.75: c=FIRE[2]
                else: c=FIRE[1]
                p[x,y]=c+(255,)
        # 바깥으로 튀는 불티 (칼끝 접선 방향)
        for i in range(3):
            k=f-1-i*2
            if k<0 or k>5: continue
            a=math.radians(heads[max(0,f-1-i*2)])
            r=R+5+k*3; ex=cx+math.cos(a)*r; ey=cy+math.sin(a)*r*SQ
            d.rectangle([ex-1,ey-1,ex,ey],fill=FIRE[3] if k<3 else FIRE[2])
        out.append(outline(g,FIRE[0])); ms.append([60,40,40,40,40,45,60,80,90,100][f])
    save('spin',out,ms,cx,cy)

# ── 2. 전투의 함성: 발밑 칸 둘레에서 바닥을 따라 바깥으로 타오르는 불꽃 꽃잎 (반복) ──
def aura():
    W,H=72,64; cx,cy=36,32; out=[]
    for f in range(8):
        g=Image.new('RGBA',(W,H)); p=g.load(); ph=f*2*math.pi/8
        for y in range(H):
            for x in range(W):
                d,a=polar(cx,cy,x,y)
                k=max(0,math.cos(6*a+ph*0.5))**2*0.7+max(0,math.cos(6*a+math.pi/6-ph*0.5))**2*0.5
                Rout=15+9*k+1.5*math.sin(3*a+ph)
                Rin=10
                if not (Rin<=d<=Rout): continue
                t=(d-Rin)/(Rout-Rin)
                c = FIRE[4] if t<0.18 else FIRE[3] if t<0.45 else FIRE[2] if t<0.78 else FIRE[1]
                p[x,y]=c+(255,)
        d2=ImageDraw.Draw(g)
        for i in range(5):                                   # 불티 2x2 (바깥으로 날림)
            a=i*2*math.pi/5+0.6; s=((f+i*3)%8)/8
            rr=14+s*16; ex=cx+math.cos(a)*rr; ey=cy+math.sin(a)*rr*SQ
            if s<0.85: d2.rectangle([ex-1,ey-1,ex,ey],fill=FIRE[3] if s<0.5 else FIRE[2])
        out.append(outline(g,FIRE[0]))
    save('aura',out,[90]*8,cx,cy,loop=True)

# ── 3. 메테오: 경고 원 → 그림자 + 낙하 → 섬광 → 불덩이·충격파 → 연기 구름이 바깥으로 → 그을린 자국 ──
def meteor():
    W,H=96,108; cx,cy=48,72; out=[]; ms=[]
    rnd=random.Random(5)
    puffs=[(i*2*math.pi/7+rnd.uniform(-.2,.2), rnd.uniform(4.5,6.5)) for i in range(7)]
    chunks=[(i*2*math.pi/6+0.4, rnd.uniform(0.8,1.2)) for i in range(6)]
    for f in range(17):
        g=Image.new('RGBA',(W,H)); p=g.load(); d=ImageDraw.Draw(g)
        def oval(r,fill,ox=cx,oy=cy,width=None):
            box=[ox-r,oy-r*SQ,ox+r,oy+r*SQ]
            d.ellipse(box,outline=fill,width=width) if width else d.ellipse(box,fill=fill)
        if f<5:                                              # 낙하
            RINGIN=__import__('os').environ.get('RINGIN','darkred')
            inner = pal(['#8a1f1f'])[0] if RINGIN=='darkred' else MET[0]
            if f%2==0:
                oval(22,MET[2],width=3)                                    # 착탄 범위 테두리: 바깥 줄 빨강
                oval(20,inner,width=1)                                     # 안쪽 줄은 어둡게
            else:
                oval(22,MET[1],width=3); oval(20,MET[0],width=1)           # 깜빡일 때는 보라 계열
            sr=2+f; oval(sr,MET[1])
            my=cy-46+f*9; mx=cx; rot=f*0.7
            # 불꽃 덮개: 아래(바위)가 넓고 위로 세 갈래 불꽃 혀
            for yy in range(max(0,int(my-26)),int(my+8)):
                for xx in range(int(mx-10),int(mx+11)):
                    vy=my-yy                                    # 바위 위쪽으로 +
                    if vy<-6: continue
                    half = 8.5-vy*0.28 if vy>=0 else math.sqrt(max(0,49-vy*vy*1.6))+1
                    lobe = 2.5*max(0,math.cos((xx-mx)*0.9+f))*(vy>6)
                    if abs(xx-mx)>half+lobe*0.3 or vy>20+lobe*2-abs(xx-mx)*0.6: continue
                    t=abs(xx-mx)/max(1,half)
                    c = MET[4] if (t<0.35 and vy<9) else MET[3] if t<0.7 and vy<15 else MET[2]
                    p[xx,yy]=c+(255,)
            # 각진 바위 (모서리 7개, 프레임마다 돈다)
            pts=[(mx+math.cos(rot+i*2*math.pi/7)*r, my+math.sin(rot+i*2*math.pi/7)*r*0.9) for i,r in enumerate([6,4.5,6.5,5,6,4,5.5])]
            d.polygon(pts,fill=MET[1])
            d.polygon([pts[0],pts[1],pts[2],(mx,my)],fill=MET[0])    # 그늘진 면
            d.line([mx-3,my-1,mx,my+1,mx+2,my-2],fill=MET[3],width=1) # 용암 금
            for i in range(3):                                         # 위로 남는 불티
                ey=my-20-i*6-(f%2)*2; ex=mx+(-4,3,-1)[i]
                if ey>2: d.rectangle([ex,ey,ex+1,ey+1],fill=MET[3] if i==0 else MET[2])
            ms.append(80 if f<4 else 50)
        elif f==5:                                           # 섬광
            oval(14,MET[4]); ms.append(50)
        else:
            k=f-6
            if k<5:                                          # 충격파 고리
                rr=18+k*5; oval(rr,MET[3] if k<2 else MET[2],width=2)
            if 3<=k:                                         # 그을린 자국
                sr=max(3,10-max(0,k-6)*2)
                oval(sr,MET[1])
                for a in (0.3,1.5,2.6,3.9,5.1):
                    L=sr+2+(a*7)%3; d.line([cx+math.cos(a)*sr*0.6,cy+math.sin(a)*sr*0.6*SQ,cx+math.cos(a)*L,cy+math.sin(a)*L*SQ],fill=MET[0],width=1)
                if k<7: oval(max(2,6-k),MET[2])            # 식어 가는 불씨
            if 1<=k<10:                                      # 연기 덩어리가 바깥으로
                for a,r0 in puffs:
                    s=k-1; dist=12+s*3.2; r=max(0,r0-max(0,s-3)*0.9)
                    if r<1.5: continue
                    px_,py_=cx+math.cos(a)*dist, cy+math.sin(a)*dist*SQ
                    d.ellipse([px_-r,py_-r,px_+r,py_+r],fill=MET[1]); d.ellipse([px_-r*0.6,py_-r*0.8,px_+r*0.2,py_-r*0.1],fill=MET[2] if s<3 else MET[1])
            if k<6:                                          # 불덩이 (꽃잎 모양)
                Rf=[13,17,18,16,12,7][k]
                for y in range(H):
                    for x in range(W):
                        dd,a=polar(cx,cy,x,y)
                        rr=Rf+2.5*math.cos(5*a+k*0.5)
                        if dd>rr: continue
                        t=dd/rr
                        c=MET[4] if t<0.3 and k<3 else MET[3] if t<0.6 else MET[2]
                        if k>=4: c=MET[2] if t<0.6 else MET[1]
                        p[x,y]=c+(255,)
            if 0<=k<6:                                       # 파편 2x2~3x3
                for a,sp in chunks:
                    dist=10+k*6*sp; hz=-k*(6-k)*0.9
                    x=cx+math.cos(a)*dist; y=cy+math.sin(a)*dist*SQ+hz
                    d.rectangle([x-1,y-1,x+1,y+1],fill=MET[1]); d.point((x-1,y-1),fill=MET[3] if k<3 else MET[2])
            ms.append([50,60,70,70,80,80,90,100,110,120,140][k] if k<11 else 120)
        out.append(outline(g,MET[0]))
    save('meteor',out,ms,cx,cy)

# ── 4. 잎사귀 화살비: 위에서 본 화살(깃 쪽이 크게, 그림자로 내려앉음) ──
def rain():
    OUT,SH,BASE,LT,WH=LEAF; W,H=96,76; cx,cy=48,40; out=[]
    rnd=random.Random(3)
    spots=[]
    while len(spots)<10:
        a=rnd.uniform(0,2*math.pi); r=math.sqrt(rnd.random())*28
        x,y=cx+math.cos(a)*r, cy+math.sin(a)*r*SQ
        if all(math.hypot(x-u,y-v)>8 for u,v,_ in spots): spots.append((x,y,len(spots)//2))
    FR=18
    for f in range(FR):
        g=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(g)
        if f<9 and f%2==0:
            r=33-f//2; d.ellipse([cx-r,cy-r*SQ,cx+r,cy+r*SQ],outline=LT,width=2)
        for x,y,s in spots:
            t=f-s
            if t<0: continue
            if t<4:     # 하늘에서 내려옴: 그림자가 커지고 화살이 그림자 쪽으로 (왼쪽 위에서 비스듬히)
                sr=1+t//2; d.ellipse([x-sr-1,y-sr*SQ,x+sr+1,y+sr*SQ],fill=SH)
                h=(3-t)*6+2; ax,ay=x-h*0.35,y-h
                d.line([ax,ay,ax-3,ay-5],fill=BASE,width=2)                 # 대
                d.rectangle([ax-5,ay-8,ax-2,ay-6],fill=LT); d.point((ax-5,ay-8),fill=WH)   # 깃
                d.rectangle([ax-1,ay-1,ax,ay],fill=WH)                    # 촉
            elif t<6:   # 꽂힘: 위에서 본 화살 = 깃 십자 + 고리 + 잎 4장
                k=t-4; rr=4+k*3
                if k==0:
                    d.rectangle([x-4,y-1,x+3,y],fill=WH); d.rectangle([x-1,y-3,x,y+2],fill=WH)
                for a in (0.5,2.1,3.7,5.3):
                    lx=x+math.cos(a)*(5+k*4); ly=y+math.sin(a)*(5+k*4)*SQ
                    d.polygon([(lx-2,ly),(lx,ly-1),(lx+2,ly),(lx,ly+1)],fill=BASE); d.point((lx,ly),fill=LT)
                d.rectangle([x-2,y-1,x+1,y],fill=BASE); d.rectangle([x-1,y-2,x,y+1],fill=BASE); d.rectangle([x-1,y-1,x,y],fill=SH)
            elif t<10:  # 꽂혀 남은 화살 (위에서 본 깃 십자)
                d.rectangle([x-2,y-1,x+1,y],fill=BASE); d.rectangle([x-1,y-2,x,y+1],fill=BASE); d.rectangle([x-1,y-1,x,y],fill=SH)
        out.append(outline(g,OUT))
    save('rain',out,[60]*FR,cx,cy)
ring(); spin(); aura(); meteor(); rain()
