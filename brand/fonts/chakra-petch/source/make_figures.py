# Chakra Petch with tabular (fixed-width) digits, for dashboard figures. Chakra Petch is OFL 1.1 with no Reserved Font Name;
# the modified font is renamed "Chakra Petch Figures" so it is never mistaken for the original.
import sys
from fontTools.ttLib import TTFont
src,dst,weight=sys.argv[1],sys.argv[2],int(sys.argv[3])
f=TTFont(src); cmap=f.getBestCmap(); hm=f['hmtx']; glyf=f['glyf']
digits=[cmap[ord(d)] for d in '0123456789']
W=max(hm[g][0] for g in digits)
for g in digits:
    adv,lsb=hm[g]; gl=glyf[g]
    if gl.numberOfContours==0: hm[g]=(W,lsb); continue
    gl.recalcBounds(glyf); width=gl.xMax-gl.xMin
    dx=round((W-width)/2-gl.xMin)
    gl.coordinates.translate((dx,0)); gl.recalcBounds(glyf)
    hm[g]=(W,gl.xMin)
for rec in f['name'].names:
    if rec.nameID in (1,4,16):
        s=rec.toUnicode()
        rec.string=s.replace('Chakra Petch','Chakra Petch Figures')
    if rec.nameID==6:
        rec.string=rec.toUnicode().replace('ChakraPetch','ChakraPetchFigures')
f.flavor='woff2'; f.save(dst); print(dst,'digit width',W)
