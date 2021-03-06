#!/usr/bin/env python
# coding=utf-8
import numpy as np
import cv2
from cStringIO import StringIO
from PIL import Image
import sys
import pytesseract
import re
import base64

data = base64.decodestring(sys.argv[1])
adaptive = np.asarray(bytearray(data), dtype='uint8')
adaptive = cv2.imdecode(adaptive, cv2.IMREAD_COLOR) # 转换为灰度图
for i in range(0, len(adaptive)):
	for j in range(0, len(adaptive[0])):
		sub = abs(230 - adaptive[i][j][2]) + abs(20 - adaptive[i][j][1]) + abs(20 - adaptive[i][j][0])
		if sub < 200:
			adaptive[i][j] = [0, 0, 0]
		else:
			adaptive[i][j] = [255, 255, 255]
adaptive = cv2.cvtColor(adaptive, cv2.COLOR_RGB2GRAY);

adaptive = cv2.resize(adaptive, (0,0), fx=4, fy=4) # 将图片放大4倍，方便降噪和识别
adaptive = cv2.medianBlur(adaptive, 9) # 模糊降噪

img = Image.fromarray(adaptive)
verify = pytesseract.image_to_string(img, lang='jwxtCheckCode') # 使用tesseract识别

result = re.sub(r'\D', '', verify) # 将非数字去除
print result