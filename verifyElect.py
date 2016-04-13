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
adaptive = cv2.imdecode(adaptive, cv2.IMREAD_GRAYSCALE) # 转换为灰度图
adaptive = adaptive[1:-2, 1:-2] # 裁剪掉边缘
adaptive = cv2.adaptiveThreshold(adaptive, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, 40)   # 自适应二值化
adaptive = cv2.resize(adaptive, (0,0), fx=4, fy=4) # 将图片放大4倍，方便降噪和识别
adaptive = cv2.medianBlur(adaptive, 9) # 模糊降噪

im = Image.fromarray(adaptive)
verify = pytesseract.image_to_string(im, lang='checkcode') # 使用tesseract识别

result = re.sub(r'[^A-Z]', '', verify) # 将非字母去除
print result