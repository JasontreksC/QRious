import Image from 'next/image';
import styles from './y2k-theme.module.css';

type FestivalBenefitsCouponsProps = {
  matched?: boolean;
};

const COUPONS = [
  {
    id: 'photo',
    label: 'COUPON 1',
    booth: '컴소과 낮 게임 부스',
    benefit: '연성네컷 촬영 + 인화 1매 무료',
    image: '/images/service_photo.png',
    imageAlt: '연성네컷 촬영 예시',
  },
  {
    id: 'menu',
    label: 'COUPON 2',
    booth: '컴소과 저녁 주점 부스',
    benefit: '김치전 + 감자전 무료 제공',
    image: '/images/service_menu.png',
    imageAlt: '김치전과 감자전',
  },
] as const;

export function FestivalBenefitsCoupons({
  matched = false,
}: FestivalBenefitsCouponsProps) {
  return (
    <section className={styles.benefitsBook} aria-labelledby="couple-benefits-title">
      <div className={styles.benefitsBookBinding} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className={styles.benefitsBookHeader}>
        <p className={styles.benefitsBookKicker}>COMSO FESTIVAL BENEFITS</p>
        <h2 id="couple-benefits-title" className={styles.benefitsBookTitle}>
          매칭된 커플 혜택!
        </h2>
        <p className={styles.benefitsBookLead}>
          {matched
            ? '두 분이 함께 매칭 결과 화면을 보여 주세요.'
            : '매칭이 성사된 커플에게 제공되는 혜택이에요.'}
        </p>
      </header>

      <div className={styles.benefitsCouponList}>
        {COUPONS.map((coupon) => (
          <article
            key={coupon.id}
            className={`${styles.benefitCoupon} ${
              coupon.id === 'photo'
                ? styles.benefitCouponPhoto
                : styles.benefitCouponMenu
            }`}
          >
            <div className={styles.benefitCouponImage}>
              <Image
                src={coupon.image}
                alt={coupon.imageAlt}
                fill
                sizes="(max-width: 480px) 34vw, 150px"
              />
            </div>
            <div className={styles.benefitCouponContent}>
              <div className={styles.benefitCouponTopline}>
                <span className={styles.benefitCouponLabel}>{coupon.label}</span>
                <span className={styles.benefitCouponFree}>FREE</span>
              </div>
              <p className={styles.benefitCouponBooth}>{coupon.booth}</p>
              <p className={styles.benefitCouponBenefit}>{coupon.benefit}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
