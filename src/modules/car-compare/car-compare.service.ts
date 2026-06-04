import { Injectable } from '@nestjs/common';
import { CarListingNormalized, CarSource } from './car-compare.types';

interface FetchResult {
  html: string;
  finalUrl: string;
}

@Injectable()
export class CarCompareService {
  async compareCars(urls: string[]) {
    const listings = await Promise.all(urls.map((url) => this.extractFromUrl(url)));

    return {
      requestedAt: new Date().toISOString(),
      count: listings.length,
      listings,
      fields: [
        '모델명',
        '연식',
        '가격',
        '사고여부',
        '사고이력',
        '주행거리',
        '연료',
        '변속기',
        '색상',
        '구동/차체',
        '보증',
        '판매처/위치',
      ],
    };
  }

  private async extractFromUrl(rawUrl: string): Promise<CarListingNormalized> {
    const url = new URL(rawUrl);
    const source = this.getSource(url);

    try {
      if (source === 'heydealer' || source === 'bmw-certified') {
        return await this.extractWithBrowser(source, url.toString());
      }
      const fetched = await this.fetchHtml(url.toString());
      return this.parseListing(source, fetched.finalUrl, fetched.html);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '페이지를 가져오는 중 알 수 없는 오류가 발생했습니다.';

      return this.createBaseListing(source, rawUrl, {
        supported: false,
        title: this.humanizeFromUrl(rawUrl),
        notes: [message],
      });
    }
  }

  private async extractWithBrowser(
    source: CarSource,
    url: string,
  ): Promise<CarListingNormalized> {
    const interceptPattern =
      source === 'heydealer' ? '/v2/customers/web/market/cars/' : undefined;

    const { html, intercepted } = await this.fetchWithBrowser(url, { interceptPattern });

    if (source === 'heydealer' && intercepted !== null) {
      return this.parseHeydealerApiResponse(url, intercepted);
    }

    return this.parseListing(source, url, html);
  }

  private async fetchWithBrowser(
    url: string,
    options: { interceptPattern?: string; waitUntil?: 'load' | 'networkidle' } = {},
  ): Promise<{ html: string; intercepted: unknown }> {
    const playwright = await import('playwright').catch(() => null);
    if (!playwright) {
      throw new Error(
        'playwright 패키지가 설치되지 않았습니다. npm install playwright를 실행하세요.',
      );
    }

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
      });

      const page = await context.newPage();
      let intercepted: unknown = null;

      // For API interception: use waitForResponse so we don't wait for networkidle
      // (some SPAs never reach networkidle due to background polling)
      const responsePromise = options.interceptPattern
        ? page
            .waitForResponse(
              (r) =>
                r.url().includes(options.interceptPattern!) &&
                r.request().method() === 'GET',
              { timeout: 28000 },
            )
            .catch(() => null)
        : Promise.resolve(null);

      await page.goto(url, {
        waitUntil: options.waitUntil ?? (options.interceptPattern ? 'load' : 'networkidle'),
        timeout: 30000,
      });

      const apiResponse = await responsePromise;
      if (apiResponse && apiResponse.ok()) {
        try {
          const json = await apiResponse.json();
          if (json && typeof json === 'object' && !('toast' in (json as object))) {
            intercepted = json;
          }
        } catch {}
      }

      const html = await page.content();
      return { html, intercepted };
    } finally {
      await browser.close();
    }
  }

  private async fetchHtml(url: string): Promise<FetchResult> {
    const response = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`원본 페이지 요청 실패 (${response.status})`);
    }

    return {
      html: await response.text(),
      finalUrl: response.url,
    };
  }

  private parseListing(source: CarSource, url: string, html: string): CarListingNormalized {
    switch (source) {
      case 'encar':
        return this.parseEncar(url, html);
      case 'hyundai-certified':
        return this.parseHyundai(url, html);
      case 'kia-certified':
        return this.parseKia(url, html);
      case 'benz-certified':
        return this.parseBenz(url, html);
      case 'bmw-certified':
        return this.parseBmw(url, html);
      case 'heydealer':
        return this.parseHeydealer(url, html);
      default:
        return this.parseFallback(source, url, html);
    }
  }

  private parseEncar(url: string, html: string): CarListingNormalized {
    const state = this.parseAssignedJson(
      html,
      /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?})<\/script>/,
    );
    const detail = state?.detail;
    const base = detail?.base;
    const category = base?.category;
    const spec = base?.spec;
    const partnership = base?.partnership;
    const metaDescription =
      this.metaContent(html, 'description') ?? this.metaContent(html, 'og:description');
    const summary =
      this.stringOrNull(base?.advertisement?.oneLineText) ??
      this.firstMatch(html, /"oneLineText":"([^"]+)"/);
    const rawTitle = this.metaContent(html, 'og:title') ?? this.extractTitle(html);
    const modelName =
      [category?.manufacturerName, category?.modelName, category?.gradeName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.cleanEncarTitle(rawTitle);
    const year =
      this.formatYearMonth(category?.yearMonth) ??
      this.stringOrNull(category?.formYear) ??
      this.firstMatch(metaDescription ?? '', /연식:\s*([^,]+)/);
    const mileageText =
      this.toKmText(spec?.mileage) ??
      this.firstMatch(metaDescription ?? '', /주행거리:\s*([\d,]+km)/);
    const fuel =
      this.stringOrNull(spec?.fuelName) ??
      this.firstMatch(metaDescription ?? '', /연료:\s*([^,]+)/);
    const color =
      this.stringOrNull(spec?.colorName) ??
      this.firstMatch(metaDescription ?? '', /색상:\s*([^,]+)/);
    const priceValue =
      this.toNumber(base?.advertisement?.price) ?? this.parseNumber(this.firstMatch(html, /"price":(\d+)/));
    const mileageKm = this.toNumber(spec?.mileage) ?? this.parseNumber(mileageText);

    return this.createBaseListing('encar', url, {
      supported: true,
      title: rawTitle,
      modelName,
      year,
      registrationDate: this.formatDate(base?.manage?.registDateTime),
      priceText: priceValue ? `${priceValue.toLocaleString('ko-KR')}만원` : null,
      priceAmount: priceValue ? priceValue * 10000 : null,
      mileageText,
      mileageKm,
      accidentStatus: this.inferEncarAccident(summary),
      accidentHistory: summary,
      fuel,
      transmission:
        this.stringOrNull(spec?.transmissionName) ??
        this.firstMatch(html, /"transmissionName":"([^"]+)"/),
      color,
      drivetrain: this.stringOrNull(base?.advertisement?.leaseRentInfo?.driveType),
      bodyType:
        this.stringOrNull(spec?.bodyName) ?? this.firstMatch(html, /"bodyName":"([^"]+)"/),
      displacement:
        (spec?.displacement ? `${spec.displacement}cc` : null) ??
        (this.firstMatch(html, /"displacement":(\d+)/)
          ? `${this.firstMatch(html, /"displacement":(\d+)/)}cc`
          : null),
      seller:
        this.stringOrNull(partnership?.dealer?.name) ??
        this.firstMatch(html, /"dealer":\{"userId":"[^"]+","name":"([^"]+)"/),
      location:
        this.stringOrNull(base?.contact?.address) ??
        this.firstMatch(html, /"contact":\{[^}]*"address":"([^"]+)"/),
      plateNumber:
        this.stringOrNull(base?.vehicleNo) ?? this.firstMatch(html, /"vehicleNo":"([^"]+)"/),
      warranty: this.buildWarrantyText(category?.warranty),
      imageUrl: this.buildEncarImageUrl(base?.photos?.[0]?.path) ?? this.metaContent(html, 'og:image'),
      options: this.limitStrings(base?.options?.standard, 12),
      highlights: this.splitHighlights(summary),
      specs: this.cleanSpecs({
        제조사: this.stringOrNull(category?.manufacturerName),
        차대번호: this.stringOrNull(base?.vin) ?? this.firstMatch(html, /"vin":"([^"]+)"/),
        배기량:
          (spec?.displacement ? `${spec.displacement}cc` : null) ??
          (this.firstMatch(html, /"displacement":(\d+)/)
            ? `${this.firstMatch(html, /"displacement":(\d+)/)}cc`
            : null),
        홈서비스: base?.advertisement?.homeService ? '가능' : null,
        진단차량: base?.advertisement?.diagnosisCar ? '예' : null,
      }),
    });
  }

  private parseHyundai(url: string, html: string): CarListingNormalized {
    const accidentCase = this.firstMatch(
      html,
      /보험사고이력\s*<span class="case">([^<]+)<\/span>/,
    );
    const specialCase = this.firstMatch(
      html,
      /보험 특수 사고이력\s*<span class="case">([^<]+)<\/span>/,
    );
    const accidentDates = [...html.matchAll(/사고일자[^0-9]*([0-9.]+)/g)].map((match) => match[1]);

    return this.createBaseListing('hyundai-certified', url, {
      supported: true,
      title:
        this.inputValue(html, 'vehicle_name') ??
        this.metaContent(html, 'og:title') ??
        this.extractTitle(html),
      modelName:
        [
          this.inputValue(html, 'vehicle_model'),
          this.inputValue(html, 'vehicle_grade'),
          this.inputValue(html, 'vehicle_trim'),
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
      year: this.inputValue(html, 'vehicle_year'),
      registrationDate: null,
      priceText:
        this.inputValue(html, 'vehicle_price') ??
        (this.inputValue(html, 'price') ? `${this.inputValue(html, 'price')}만원` : null),
      priceAmount: this.normalizePriceAmount(
        this.inputValue(html, 'carPrc1') ?? this.inputValue(html, 'item_price'),
      ),
      mileageText: this.inputValue(html, 'vehicle_mile'),
      mileageKm: this.parseNumber(this.inputValue(html, 'vehicle_mile')),
      accidentStatus:
        accidentCase === '없음'
          ? '무사고에 가까움'
          : accidentCase
            ? '사고이력 있음'
            : null,
      accidentHistory:
        [
          specialCase ? `특수사고: ${specialCase}` : null,
          accidentCase ? `보험사고: ${accidentCase}` : null,
          accidentDates.length ? `사고일자: ${accidentDates.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(' / ') || null,
      fuel: this.inputValue(html, 'vehicle_fuel'),
      transmission: this.inputValue(html, 'vehicle_transmission'),
      color: this.inputValue(html, 'vehicle_color'),
      drivetrain: this.inputValue(html, 'vehicle_engine'),
      bodyType: this.inputValue(html, 'vehicle_body'),
      displacement: this.inputValue(html, 'vehicle_displacement'),
      seller: this.firstMatch(html, /판매지점[^<]*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/),
      location: this.firstMatch(html, /지역[^<]*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/),
      plateNumber: this.extractPlateNumber(
        this.cleanInlineText(this.firstMatch(html, /<p class="car_num">([\s\S]*?)<\/p>/)),
      ),
      warranty: this.collectText(html, ['제조사 보증', '블루멤버스', '보증']),
      imageUrl: this.metaContent(html, 'og:image'),
      highlights: this.splitHighlights(this.metaContent(html, 'description')),
      specs: this.cleanSpecs({
        모델군: this.inputValue(html, 'vehicle_modelgroup'),
        등급: this.inputValue(html, 'vehicle_grade'),
        트림: this.inputValue(html, 'vehicle_trim'),
      }),
      notes: ['현대 인증중고차는 숨은 입력값과 보험이력 영역을 조합해 비교합니다.'],
    });
  }

  private parseKia(url: string, html: string): CarListingNormalized {
    const nextData = this.parseJsonScriptById(html, '__NEXT_DATA__');
    const product = nextData?.props?.pageProps?.productSSR;
    const car = product?.car;
    const insurance = product?.insuranceRecord;
    const performance = product?.performanceRecord;

    return this.createBaseListing('kia-certified', url, {
      supported: true,
      title:
        product?.seoProps?.title ??
        this.metaContent(html, 'og:title') ??
        this.extractTitle(html),
      modelName: this.stringOrNull(car?.modelName),
      year: car?.modelYear ? String(car.modelYear) : null,
      registrationDate: this.formatDate(car?.firstRegisteredOn),
      priceText: car?.price ? this.toPriceText(car.price) : null,
      priceAmount: this.toNumber(car?.price),
      mileageText: this.toKmText(car?.drivingDistance),
      mileageKm: this.toNumber(car?.drivingDistance),
      accidentStatus:
        insurance?.damaged === 0 && performance?.panelOrExchange === 0
          ? '무사고에 가까움'
          : '사고이력 확인 필요',
      accidentHistory: [
        insurance?.damaged === 0 ? '보험이력 없음' : `보험 손상 ${insurance?.damaged ?? 0}건`,
        performance?.panelOrExchange === 0 ? '판금/교환 없음' : `판금/교환 ${performance?.panelOrExchange ?? 0}건`,
      ].join(' / '),
      fuel: this.translateFuelCode(car?.fuelType),
      transmission: this.stringOrNull(car?.mission),
      color: this.stringOrNull(car?.color?.exteriorCodeName),
      drivetrain: this.stringOrNull(car?.engine),
      bodyType: this.stringOrNull(car?.modelCategory),
      displacement: car?.displacement ? `${car.displacement}cc` : null,
      seller: this.stringOrNull(product?.productSeller?.name),
      location: this.stringOrNull(product?.productSeller?.address?.main),
      plateNumber: this.stringOrNull(car?.plateNumber),
      warranty: this.buildKiaWarranty(product?.warranties),
      imageUrl: this.buildKiaImageUrl(car?.images?.[0]?.url),
      options: (product?.mainOptions ?? [])
        .filter((item: { has?: boolean }) => item?.has)
        .map((item: { mainOption?: string }) => item.mainOption)
        .filter((value: string | undefined): value is string => Boolean(value))
        .slice(0, 12),
      highlights: (product?.customKeywords ?? [])
        .map((item: { keyword?: string }) => item.keyword)
        .filter((value: string | undefined): value is string => Boolean(value))
        .slice(0, 6),
      specs: this.cleanSpecs({
        내장색: this.stringOrNull(car?.color?.interiorCodeName),
        도어: this.stringOrNull(car?.door),
        옵션개수: product?.optionCount ? `${product.optionCount}개` : null,
        판매채널: this.stringOrNull(product?.displayChannel),
      }),
    });
  }

  private parseBenz(url: string, html: string): CarListingNormalized {
    const product = this.extractJsonAtMarker(html, '"preloadedData":{"productDetail":') as Record<string, unknown> | null;

    const mileageText =
      this.stringOrNull((product as any)?.technicalInformation?.mileage?.formattedValue) ??
      this.firstMatch(html, /data-test-id="dcp-cars-buy-box-vehicle-characteristics-ucos-mileage"[^>]*>\s*([^<]+)/);

    const priceRaw = this.cleanInlineText(
      this.firstMatch(html, /data-test-id="dcp-cars-buy-box-price"[^>]*>([\s\S]*?)<\/[a-z]+>/),
    );
    const priceText = priceRaw && /\d/.test(priceRaw) ? priceRaw : null;

    const engineType = this.stringOrNull((product as any)?.engineType);

    return this.createBaseListing('benz-certified', url, {
      supported: true,
      title:
        this.stringOrNull((product as any)?.vehicleModel?.name) ??
        this.metaContent(html, 'og:title') ??
        this.extractTitle(html),
      modelName:
        [(product as any)?.model, (product as any)?.vehicleModel?.name]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
      year:
        this.stringOrNull((product as any)?.modelYear) ??
        this.stringOrNull((product as any)?.vehicleModel?.modelYear),
      registrationDate: this.formatDate((product as any)?.identification?.firstRegistrationDate),
      priceText,
      priceAmount: this.parseNumber(priceText),
      mileageText,
      mileageKm: this.parseNumber(mileageText),
      accidentStatus: '확인 필요',
      accidentHistory:
        '벤츠 인증 페이지는 공개 HTML에 사고 세부 값이 제한적으로만 포함되어 있습니다.',
      fuel:
        this.stringOrNull((product as any)?.technicalInformation?.engine?.fuelType?.formattedValue) ??
        this.translateEngineType(engineType),
      transmission: this.stringOrNull(
        (product as any)?.technicalInformation?.transmission?.transmissionCategory?.formattedValue,
      ),
      color: this.stringOrNull((product as any)?.color?.text),
      drivetrain: this.translateEngineType(engineType) ?? engineType,
      bodyType: this.stringOrNull(
        (product as any)?.technicalInformation?.bodyType?.formattedValue,
      ),
      displacement: null,
      seller: this.stringOrNull((product as any)?.usedCarFields?.sellerName),
      location: null,
      plateNumber: this.stringOrNull((product as any)?.usedCarFields?.registrationNumber),
      warranty: this.stringOrNull((product as any)?.usedCarFields?.warrantyInfo),
      imageUrl:
        this.stringOrNull((product as any)?.primaryImage?.url) ??
        this.stringOrNull((product as any)?.images?.misc?.[0]?.url),
      options: (product as any)?.enrichedEquipments?.categories?.highlights?.slice?.(0, 10) ?? [],
      highlights: [(product as any)?.stock?.stockCategories?.join(', '), (product as any)?.summary]
        .filter((v): v is string => Boolean(v)),
      specs: this.cleanSpecs({
        차종: this.stringOrNull((product as any)?.vehicleModel?.vehicleClass?.formattedValue),
        시트: this.stringOrNull((product as any)?.upholstery?.text),
        압류저당: this.stringOrNull((product as any)?.usedCarFields?.pledgeStatus),
      }),
      notes: [
        product ? null : '페이지 데이터 추출 실패 — preloadedData를 찾지 못했습니다.',
        '가격은 페이지에서 동적으로 로드되어 자동 추출이 어렵습니다. 원문 링크에서 확인하세요.',
      ].filter(Boolean) as string[],
    });
  }

  private parseBmw(url: string, html: string): CarListingNormalized {
    const isRendered = html.length > 50000;

    // Model name: try inline JSON "name":"BMW ..." first, then H1 (strip inner tags)
    const modelFromJson = this.firstMatch(html, /"name":"(BMW [^"]{3,80})"/);
    const h1Raw = this.firstMatch(html, /<h1[^>]*>([\s\S]+?)<\/h1>/);
    const h1 = h1Raw ? h1Raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
    const modelName = modelFromJson ?? h1;

    // Year from inline JSON (rendered DOM keeps vehicleModelDate in JS state)
    const year = this.firstMatch(html, /"vehicleModelDate":(\d{4})/);

    // Registration date from key-fact
    const regDateRaw = this.bmwKeyFact(html, 'registrationDate');
    const regDate = regDateRaw
      ? regDateRaw.replace(/년\s*/, '-').replace(/월/, '').trim()
      : null;

    // Mileage from key-fact
    const mileageText = this.bmwKeyFact(html, 'mileageInKm');

    // Price from first <strong>₩...</strong> (selling price, not monthly payment)
    const priceRaw = this.firstMatch(html, /<strong[^>]*>\s*₩\s*([\d,]+)\s*<\/strong>/);
    const priceWon = this.parseNumber(priceRaw);
    const priceText = priceWon
      ? `${Math.round(priceWon / 10000).toLocaleString('ko-KR')}만원`
      : null;

    // Fuel, transmission, drivetrain, body from inline JS state JSON
    const fuelCode = this.firstMatch(html, /"fuelType":"([^"]+)"/);
    const transCode = this.firstMatch(html, /"vehicleTransmission":"([^"]+)"/);
    const driveCode = this.firstMatch(html, /"driveWheelConfiguration":"([^"]+)"/);
    const bodyCode = this.firstMatch(html, /"bodyType":"([^"]+)"/);

    const fuelText = fuelCode
      ? (this.translateBmwFuel(fuelCode) ??
        this.firstMatch(html, /연료 타입[^<]*<\/[^>]+>[\s\S]{0,300}?<span[^>]*>([가-힣]+)<\/span>/))
      : null;
    const transText = transCode ? this.translateBmwTrans(transCode) : null;
    const driveText = driveCode ? this.translateBmwDrive(driveCode) : null;
    const bodyText = bodyCode ? this.translateBmwBodyType(bodyCode) : null;

    // Plate, VIN, accident from key-facts
    const plate = this.bmwKeyFact(html, 'licencePlate');
    const vin = this.bmwKeyFact(html, 'vin17');
    const seize = this.bmwKeyFact(html, 'seizeCount');
    const mortgage = this.bmwKeyFact(html, 'mortgageCount');

    const accidentHistory = [
      seize && seize !== '0' ? `압류: ${seize}건` : null,
      mortgage && mortgage !== '0' ? `저당: ${mortgage}건` : null,
    ].filter(Boolean).join(' / ') || '압류·저당 없음';

    return this.createBaseListing('bmw-certified', url, {
      supported: isRendered,
      title: modelName,
      modelName,
      year,
      registrationDate: regDate,
      priceText,
      priceAmount: priceWon,
      mileageText,
      mileageKm: this.parseNumber(mileageText),
      accidentStatus: isRendered ? '확인 필요 (원문 링크에서 사고이력 상세 확인)' : null,
      accidentHistory: isRendered ? accidentHistory : null,
      fuel: fuelText,
      transmission: transText,
      color: null,
      drivetrain: driveText,
      bodyType: bodyText,
      displacement: null,
      seller: this.bmwKeyFact(html, 'scName'),
      location: null,
      plateNumber: plate,
      warranty: 'BMW 공식 인증중고차 (BMW Premium Selection)',
      imageUrl: this.metaContent(html, 'og:image'),
      highlights: [],
      specs: this.cleanSpecs({
        차대번호: vin,
        인증담당연락처: this.bmwKeyFact(html, 'scMobilePhone'),
      }),
      notes: isRendered
        ? ['Playwright로 렌더링 후 DOM + 인라인 JSON에서 추출했습니다.']
        : [
            'BMW 인증중고차 사이트는 JavaScript SPA입니다.',
            '백엔드에서 Playwright가 실행되어야 데이터를 추출할 수 있습니다.',
          ],
    });
  }

  private bmwKeyFact(html: string, key: string): string | null {
    const pattern = new RegExp(
      `data-key-facts-key="${this.escapeRegExp(key)}"[^<]*<\\/div>[\\s\\S]{0,400}?<span[^>]*>([^<]+)<\\/span>`,
    );
    return this.firstMatch(html, pattern);
  }

  private translateBmwFuel(value: string): string | null {
    const map: Record<string, string> = {
      GASOLINE: '가솔린',
      DIESEL: '디젤',
      ELECTRIC: '전기',
      HYBRID: '하이브리드',
      PLUG_IN_HYBRID: '플러그인 하이브리드',
      MILD_HYBRID: '마일드 하이브리드',
    };
    return map[value] ?? null;
  }

  private translateBmwTrans(value: string): string | null {
    const map: Record<string, string> = {
      AUTOMATIC: '자동',
      MANUAL: '수동',
      SEMI_AUTOMATIC: '세미 자동',
    };
    return map[value] ?? null;
  }

  private translateBmwDrive(value: string): string | null {
    const map: Record<string, string> = {
      ALL_WHEEL: 'xDrive (상시 AWD)',
      FRONT_WHEEL: '전륜 구동 (FWD)',
      REAR_WHEEL: '후륜 구동 (RWD)',
    };
    return map[value] ?? null;
  }

  private translateBmwBodyType(value: string): string | null {
    const map: Record<string, string> = {
      SPORT_ACTIVITY_VEHICLE: 'SAV (SUV)',
      SEDAN: '세단',
      COUPE: '쿠페',
      CONVERTIBLE: '컨버터블',
      SPORTS_CAR: '스포츠카',
      WAGON: '왜건',
      VAN: '밴',
    };
    return map[value] ?? null;
  }

  private parseHeydealer(url: string, html: string): CarListingNormalized {
    const title = this.metaContent(html, 'og:title') ?? this.extractTitle(html);
    const description = this.metaContent(html, 'description') ?? '';

    return this.createBaseListing('heydealer', url, {
      supported: false,
      title,
      modelName: title ? title.replace(/\s*[-–]\s*헤이딜러.*$/i, '').trim() || null : null,
      year: this.firstMatch(description, /(20\d{2})/),
      registrationDate: null,
      priceText: null,
      priceAmount: null,
      mileageText: null,
      mileageKm: null,
      accidentStatus: null,
      accidentHistory: null,
      fuel: null,
      transmission: null,
      color: null,
      drivetrain: null,
      bodyType: null,
      displacement: null,
      seller: null,
      location: null,
      plateNumber: null,
      warranty: null,
      imageUrl: this.metaContent(html, 'og:image'),
      highlights: this.splitHighlights(description),
      notes: [
        '헤이딜러는 Vite/React SPA로, 차량 상세 데이터는 API 인증(Bearer Token) 이후 동적 로딩됩니다.',
        '현재 서버 사이드 파싱으로는 가격·연식·주행거리 등 핵심 정보를 가져올 수 없습니다.',
        '원문 링크에서 직접 확인하거나, 향후 인증된 API 연동으로 해결할 수 있습니다.',
      ],
    });
  }

  private parseHeydealerApiResponse(url: string, raw: unknown): CarListingNormalized {
    const r = raw as Record<string, unknown>;
    const d = (r.detail_info ?? {}) as Record<string, unknown>;
    const carhistory = (d.carhistory ?? {}) as Record<string, unknown>;
    const inspection = (d.inspection_records ?? {}) as Record<string, unknown>;
    const colorTrim = (d.color_and_trim ?? {}) as Record<string, unknown>;
    const warranty = (r.warranty_info ?? {}) as Record<string, unknown>;
    const simpleRepair = (d.simple_repair_info ?? {}) as Record<string, unknown>;

    const modelName = [
      this.stringOrNull(d.model_part_name),
      this.stringOrNull(d.grade_name),
    ].filter(Boolean).join(' ') || this.stringOrNull(d.grade_part_name);

    // price: API field is in 만원 unit (e.g. 5550 = 5,550만원)
    const priceManwon = this.toNumber(r.price ?? r.previous_price);
    const priceWon = priceManwon ? priceManwon * 10000 : null;
    const priceText = priceManwon
      ? `${priceManwon.toLocaleString('ko-KR')}만원`
      : null;

    const mileage = this.toNumber(d.mileage);

    const accidentSummary = this.stringOrNull(
      inspection.accident_repairs_summary_display ?? d.accident_repairs_summary_display,
    );
    const myAccidentCount = this.toNumber(carhistory.my_car_accident_count) ?? 0;
    const repairCount = this.toNumber(simpleRepair.count) ?? 0;
    const accidentStatus =
      accidentSummary === '완전무사고' && myAccidentCount === 0
        ? '완전무사고'
        : myAccidentCount > 0
          ? `보험사고 ${myAccidentCount}건`
          : accidentSummary ?? '확인 필요';

    const accidentHistory = [
      accidentSummary ? `진단: ${accidentSummary}` : null,
      myAccidentCount > 0 ? `보험사고 ${myAccidentCount}건 (비용 ${(this.toNumber(carhistory.my_car_accident_cost) ?? 0).toLocaleString('ko-KR')}원)` : null,
      repairCount > 0 ? `수리 ${repairCount}건` : null,
      this.toNumber(carhistory.flooded_count) ? '침수이력 있음' : null,
      this.toNumber(carhistory.total_loss_count) ? '전손이력 있음' : null,
    ].filter(Boolean).join(' / ') || null;

    const options = Array.isArray(d.options)
      ? (d.options as Record<string, unknown>[])
          .filter(o => o.availability === 'default')
          .map(o => this.stringOrNull(o.name))
          .filter((v): v is string => Boolean(v))
          .slice(0, 12)
      : [];

    const images = Array.isArray(d.preview_images) ? d.preview_images as Record<string, unknown>[] : [];
    const imageUrl = images[0] ? this.stringOrNull(images[0].url) : null;

    return this.createBaseListing('heydealer', url, {
      supported: true,
      title: modelName,
      modelName,
      year: d.year ? String(d.year) : null,
      registrationDate: this.formatDate(this.stringOrNull(d.initial_registration_date)),
      priceText,
      priceAmount: priceWon,
      mileageText: mileage ? `${mileage.toLocaleString('ko-KR')}km` : null,
      mileageKm: mileage,
      accidentStatus,
      accidentHistory,
      fuel: this.stringOrNull(d.fuel_display) ?? this.stringOrNull(d.fuel),
      transmission: this.stringOrNull(d.transmission_display) ?? this.stringOrNull(d.transmission),
      color: this.stringOrNull(colorTrim.exterior_description),
      drivetrain: this.stringOrNull(d.wheel_drive),
      bodyType: null,
      displacement: d.displacement ? `${d.displacement}cc` : null,
      seller: null,
      location: null,
      plateNumber: this.stringOrNull(r.car_number),
      warranty: this.stringOrNull(warranty.description),
      imageUrl,
      options,
      highlights: [
        this.stringOrNull(d.recommendation_comment)?.split('\n')[0]?.trim() ?? null,
      ].filter((v): v is string => Boolean(v)),
      specs: this.cleanSpecs({
        내장색: this.stringOrNull(colorTrim.interior_description),
        구동방식: this.stringOrNull(d.wheel_drive),
        최고출력: this.stringOrNull(d.max_power),
        연비: this.stringOrNull(d.efficiency),
        공장출고가: d.factory_price ? `${d.factory_price}만원` : null,
        소유자변경: carhistory.owner_changed_count ? `${carhistory.owner_changed_count}회` : null,
      }),
      notes: ['헤이딜러 인증중고차 API(Playwright 인터셉트)를 통해 수집한 데이터입니다.'],
    });
  }

  private parseFallback(source: CarSource, url: string, html: string): CarListingNormalized {
    return this.createBaseListing(source, url, {
      supported: false,
      title: this.metaContent(html, 'og:title') ?? this.extractTitle(html),
      notes: ['아직 전용 파서가 없는 사이트입니다.'],
    });
  }

  private createBaseListing(
    source: CarSource,
    url: string,
    overrides: Partial<CarListingNormalized>,
  ): CarListingNormalized {
    return {
      source,
      sourceLabel: this.sourceLabel(source),
      url,
      fetchedAt: new Date().toISOString(),
      supported: false,
      title: null,
      modelName: null,
      year: null,
      registrationDate: null,
      priceText: null,
      priceAmount: null,
      mileageText: null,
      mileageKm: null,
      accidentStatus: null,
      accidentHistory: null,
      fuel: null,
      transmission: null,
      color: null,
      drivetrain: null,
      bodyType: null,
      displacement: null,
      seller: null,
      location: null,
      plateNumber: null,
      warranty: null,
      imageUrl: null,
      options: [],
      highlights: [],
      specs: {},
      notes: [],
      ...overrides,
    };
  }

  private getSource(url: URL): CarSource {
    const host = url.hostname.toLowerCase();

    if (host.includes('heydealer.com')) return 'heydealer';
    if (host.includes('encar.com')) return 'encar';
    if (host.includes('certified.hyundai.com')) return 'hyundai-certified';
    if (host.includes('cpo.kia.com')) return 'kia-certified';
    if (host.includes('bmw.co.kr')) return 'bmw-certified';
    if (host.includes('mercedes-benz.co.kr')) return 'benz-certified';

    return 'unknown';
  }

  private sourceLabel(source: CarSource) {
    switch (source) {
      case 'heydealer':
        return '헤이딜러';
      case 'encar':
        return '엔카';
      case 'hyundai-certified':
        return '현대 인증중고차';
      case 'kia-certified':
        return '기아 인증중고차';
      case 'bmw-certified':
        return 'BMW 인증중고차';
      case 'benz-certified':
        return '벤츠 인증중고차';
      default:
        return '기타 사이트';
    }
  }

  private parseJsonScriptById(html: string, id: string) {
    const pattern = new RegExp(
      `<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    );
    const raw = this.firstMatch(html, pattern);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private parseAssignedJson(html: string, pattern: RegExp) {
    const raw = this.firstMatch(html, pattern);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private extractJsonAtMarker(html: string, marker: string): unknown {
    const markerIdx = html.indexOf(marker);
    if (markerIdx === -1) return null;

    const start = html.indexOf('{', markerIdx + marker.length);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
        }
      }
    }
    return null;
  }

  private metaContent(html: string, property: string) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${this.escapeRegExp(property)}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    return this.decodeHtml(this.firstMatch(html, pattern));
  }

  private inputValue(html: string, id: string) {
    const pattern = new RegExp(
      `<input[^>]+id=["']${this.escapeRegExp(id)}["'][^>]+value=["']([^"']*)["']`,
      'i',
    );
    return this.decodeHtml(this.firstMatch(html, pattern));
  }

  private extractTitle(html: string) {
    return this.decodeHtml(this.firstMatch(html, /<title>([\s\S]*?)<\/title>/i));
  }

  private collectText(html: string, labels: string[]) {
    const matches = labels.filter((label) => html.includes(label));
    return matches.length ? matches.join(', ') : null;
  }

  private firstMatch(input: string, pattern: RegExp) {
    const match = input.match(pattern);
    return match?.[1]?.trim() ?? null;
  }

  private decodeHtml(value: string | null) {
    if (!value) return null;
    return value
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanInlineText(value: string | null) {
    if (!value) return null;
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
  }

  private cleanSpecs(values: Record<string, string | null | undefined>) {
    return Object.fromEntries(
      Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
  }

  private stringOrNull(value: unknown) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return null;
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return this.parseNumber(value);
    return null;
  }

  private parseNumber(value: string | null) {
    if (!value) return null;
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizePriceAmount(value: string | null) {
    const numeric = this.parseNumber(value);
    if (!numeric) return null;
    return numeric >= 1000000 ? numeric : numeric * 10000;
  }

  private toPriceText(value: number) {
    return `${value.toLocaleString('ko-KR')}원`;
  }

  private toKmText(value: unknown) {
    const numeric = this.toNumber(value);
    return numeric ? `${numeric.toLocaleString('ko-KR')}km` : null;
  }

  private formatYearMonth(value: unknown) {
    const raw = this.stringOrNull(value);
    if (!raw) return null;
    if (/^\d{6}$/.test(raw)) return `${raw.slice(0, 4)}.${raw.slice(4, 6)}`;
    if (/^\d{4}$/.test(raw)) return raw;
    return raw;
  }

  private formatDate(value: unknown) {
    const raw = this.stringOrNull(value);
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(raw)) return raw;
    return raw;
  }

  private inferEncarAccident(summary: string | null) {
    if (!summary) return null;
    if (summary.includes('무사고') || summary.includes('완무')) {
      return '무사고에 가까움';
    }
    if (summary.includes('사고')) {
      return '사고이력 확인 필요';
    }
    return null;
  }

  private buildWarrantyText(value: unknown) {
    if (Array.isArray(value)) {
      const parts = value.filter((item): item is string => typeof item === 'string');
      return parts.length ? parts.join(', ') : null;
    }
    return this.stringOrNull(value);
  }

  private buildKiaWarranty(items: unknown) {
    if (!Array.isArray(items)) return null;
    const parts = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as { title?: string; remainDistanceText?: string; remainPeriodText?: string };
        return [entry.title, entry.remainPeriodText, entry.remainDistanceText]
          .filter(Boolean)
          .join(' ');
      })
      .filter((value): value is string => Boolean(value));
    return parts.length ? parts.join(' / ') : null;
  }

  private buildEncarImageUrl(path: unknown) {
    const raw = this.stringOrNull(path);
    if (!raw) return null;
    return raw.startsWith('http') ? raw : `https://ci.encar.com${raw}`;
  }

  private buildKiaImageUrl(url: unknown) {
    return this.stringOrNull(url);
  }

  private translateEngineType(value: string | null | undefined): string | null {
    if (!value) return null;
    const map: Record<string, string> = {
      PETROL: '가솔린',
      DIESEL: '디젤',
      ELECTRIC: '전기',
      HYBRID: '하이브리드',
      PETROL_ELECTRIC_HYBRID: '하이브리드 (가솔린)',
      PETROL_ELECTRIC_PLUGIN_HYBRID: '플러그인 하이브리드',
      MILD_HYBRID_PETROL: '마일드 하이브리드 (가솔린)',
      MILD_HYBRID_DIESEL: '마일드 하이브리드 (디젤)',
    };
    return map[value] ?? null;
  }

  private translateFuelCode(value: unknown) {
    const code = this.stringOrNull(value);
    if (!code) return null;

    const mapping: Record<string, string> = {
      GASOLINE: '가솔린',
      DIESEL: '디젤',
      LPG: 'LPG',
      ELECTRIC: '전기',
      HYBRID: '하이브리드',
      PLUG_IN_HYBRID: '플러그인 하이브리드',
    };

    return mapping[code] ?? code;
  }

  private splitHighlights(value: string | null) {
    if (!value) return [];
    return value
      .split(/[|,/]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  private limitStrings(values: unknown, limit: number) {
    if (!Array.isArray(values)) return [];
    return values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  private humanizeFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private cleanEncarTitle(title: string | null) {
    if (!title) return null;
    return title
      .replace(/\s+[가-힣]+?\s+중고차\s*:.*$/i, '')
      .replace(/\s*중고차\s*:.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractPlateNumber(value: string | null) {
    if (!value) return null;
    return value.match(/\d{2,3}[가-힣]\d{4}/)?.[0] ?? value;
  }
}
