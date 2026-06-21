# Launch Post Draft

## Short Version

내 유료 글이 구독 안 한 사람에게 새는지 30초 만에 확인하는 도구를 만들었습니다.

`article-ops`는 약한 client-side paywall/member gate를 로컬에서 재현하고, HTML 안에 숨겨진 유료 본문이 실려 있는지 검사하고, 새는 부분을 제거한 cured 파일까지 만들어줍니다.

```bash
node bin/article-ops.mjs disease --all --force
node bin/article-ops.mjs audit examples/diseases/hidden-dom.html
node bin/article-ops.mjs cure examples/diseases/hidden-dom.html --force
```

잡는 패턴:

- hidden DOM에 들어간 유료 본문
- `__NEXT_DATA__` 같은 app JSON에 들어간 본문
- client-side entitlement flag로만 막은 본문
- blur/overlay로 가린 프리미엄 텍스트

우회 도구가 아니라, 사이트 운영자가 자기 유료 콘텐츠가 클라이언트에 새는지 확인하는 방어 도구입니다.

## Stronger Hook

구독자 전용 글을 서버에서 막지 않고 CSS/JS로만 가리면, 사실상 이미 브라우저에 보낸 겁니다.

그래서 `article-ops`에 disease/shield 데모를 넣었습니다.

- disease: 약한 paywall 구현을 로컬 fixture로 재현
- shield: 숨겨진 유료 본문이 HTML/JSON에 실려 있는지 감지
- cure: 유출 블록을 제거한 sanitized copy 생성

결론: 유료 본문은 클라이언트에 숨기지 말고, 권한 확인 뒤 서버에서 내려야 합니다.
