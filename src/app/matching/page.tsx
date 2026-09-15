import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '../site-header';
import styles from '../y2k-theme.module.css';

export const metadata: Metadata = {
  title: '매칭 시스템 - QRious',
  description: 'QRious가 점수를 매기고 짝을 찾는 방식을 안내합니다.',
};

export default function MatchingGuidePage() {
  return (
    <div className={`${styles.y2kPage} min-h-screen text-[#2B1B2E] font-sans`}>
      <SiteHeader />
      <div className={styles.decorScene} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
      </div>
      <div className={`${styles.pageContent} max-w-[480px] mx-auto px-4 pt-6 pb-16`}>
        <Link href="/" className={styles.matchingBack}>
          ← 접수 페이지로
        </Link>
        <h1 className={styles.matchingTitle}>매칭 시스템</h1>
        <p className={styles.matchingLead}>
          QRious는 제비뽑기처럼 아무나 짝지어 주지 않아요.
          여러분이 적어 주신 성향, 매력, 취미, 좋아하는 것을 보고
          서로 끌릴 가능성이 높은 사람을 찾아요.
          점수는 아래 세 가지를 모아서 계산해요.
        </p>

        <section className={styles.matchingSection}>
          <h2>1. MBTI로 보는 궁합</h2>
          <p className={styles.matchingCopy}>
            MBTI는 네 가지 축을 하나씩 비교해요.
            외향(E)과 내향(I), 계획(J)과 즉흥(P)은 서로 다를 때 점수가 올라가요.
            직관(N)과 감각(S), 사고(T)와 감정(F)은 같을 때 점수가 올라가요.
          </p>
          <figure className={styles.matchingFigure}>
            <Image
              src="/images/mbti_score.png"
              alt="MBTI 네 축을 비교해 같거나 다르면 득점하고, 만점 4점으로 나눠 0에서 1 사이 점수로 만드는 그림"
              width={1138}
              height={966}
              sizes="(max-width: 480px) 92vw, 448px"
            />
          </figure>
          <p className={styles.matchingCopy}>
            네 축에서 얻은 점수를 만점 4점으로 나누면, MBTI 점수는 0에서 1 사이가 돼요.
            예를 들어 네 축이 모두 맞으면 1점, 두 축만 맞으면 0.5점이에요.
          </p>
        </section>

        <section className={styles.matchingSection}>
          <h2>2. 매력 태그가 겹치는 정도</h2>
          <p className={styles.matchingCopy}>
            내가 원하는 이상형 태그와, 상대가 가진 매력 태그를 겹쳐 봐요.
            겹치는 태그가 많을수록 “내가 그 사람을 원하는 정도”가 커져요.
          </p>
          <figure className={styles.matchingFigure}>
            <Image
              src="/images/tag_score.png"
              alt="내가 원하는 이상형 태그와 상대가 가진 매력 태그의 교집합으로 포함 계수를 구하는 그림"
              width={1466}
              height={1098}
              sizes="(max-width: 480px) 92vw, 448px"
            />
          </figure>
          <p className={styles.matchingCopy}>
            그림의 교집합이 바로 그 부분이에요.
            “옷을 잘 입는”, “솔직한”처럼 내가 바라던 모습을 상대가 이미 가지고 있으면
            점수가 올라가요.
            내가 고른 태그 중에서 상대와 맞는 비율이 포함 계수예요.
            네 개 중 두 개가 겹치면 0.5가 되는 식이에요.
          </p>
          <p className={styles.matchingNote}>
            이 점수는 한 방향만 보지 않아요.
            A가 B를 원하는 점수와, B가 A를 원하는 점수를 각각 구한 뒤
            둘의 조화평균으로 합쳐요.
            조화평균은 한쪽만 높고 한쪽이 낮으면 점수가 많이 내려가요.
            서로 원할 때 더 높은 점수가 나와요.
          </p>
        </section>

        <section className={styles.matchingSection}>
          <h2>3. 직접 적어 주신 이야기</h2>
          <p className={styles.matchingCopy}>
            마지막으로 추가로 적어 주신 매력, 취미등이 서로 얼마나 잘 맞는지 평가해요. 
            최신 AI 모델인 GPT 5.6 Luna가 직접 읽고 분석합니다.
          </p>
          <figure className={styles.matchingFigure}>
            <Image
              src="/images/ex_score_new.png"
              alt="상대에게 바라는 이야기와 내가 적어 준 매력·취미·좋아하는 것을 AI가 비교해 점수로 만드는 그림"
              width={1474}
              height={1352}
              sizes="(max-width: 480px) 92vw, 448px"
            />
          </figure>
          <p className={styles.matchingCopy}>
            점수는 0점, 0.5점, 1점으로 셋 중 하나에요.
            A가 원하는 것과 B가 가진 것, 두 문장을 두 단계에 걸쳐 파악해요.
            <br />
            1. 관련이 있는가?
            <br />
            → 없으면 0점, 있으면 다음 단계로 넘어가요.
            <br />
            2. 얼마나 비슷한가?
            <br />
            → 반대면 0점, 비슷하면 0.5점, 같으면 1점이에요.
          </p>
          <p className={styles.matchingNote}>
            이번에도 A→B와 B→A를 각각 점수를 내지만, 태그 점수와 달리 조화평균이 아닌 산술평균으로 합쳐요.
            자유 텍스트 입력은 태그보다 훨씬 다양한 주제를 다룰 수 있기 때문에, 태그보다 점수가 나올 확률이 낮아요.
            그래서 한 방향이라도 맞는 부분이 있으면 그것을 살리기로 했어요.
          </p>
        </section>

        <section className={styles.matchingSection}>
          <h2>4. 최종 점수와 매칭표</h2>
          <p className={styles.matchingCopy}>
            앞에서 구한 세 점수를 한 번에 모아요.
            MBTI : 태그 : 직접 적어 주신 이야기는 1 : 6 : 3으로 섞어요.
            태그가 제일 크고, 직접 적어 주신 이야기가 그다음,
            MBTI는 살짝 참고하는 정도예요.
          </p>
          <figure className={styles.matchingFigure}>
            <Image
              src="/images/final_score.png"
              alt="MBTI, 태그, 추가 점수를 1대 6대 3으로 합쳐 최종 점수를 만들고, 남녀 쌍을 높은 점수부터 짝 짓는 그림"
              width={1666}
              height={1370}
              sizes="(max-width: 480px) 92vw, 448px"
            />
          </figure>
          <p className={styles.matchingCopy}>
            그다음 남자와 여자의 모든 쌍에 이 최종 점수를 매겨요.
            점수가 가장 높은 쌍부터 하나씩 뽑아서 짝을 정하고,
            이미 짝이 정해진 사람은 다음 후보에서 빼요.
            그렇게 높은 점수부터 채워 나가면 최종 매칭표가 완성돼요.
          </p>
          <p className={styles.matchingNote}>
            점수는 각자 얼마나 잘났느냐에 대한 점수가 아니라,
            서로 원하는 걸 얼마나 충족시키는지에 대한 점수예요.
            그러니 점수가 낮다고 해서 실망스러운 상대를 만나게 될 거란
            오해는 하지 않길 바라요.
            아직 경험해보지 못한, 처음 느껴보는 매력인 거니까요!
          </p>
        </section>

        <p className={styles.matchingLead}>
          점수를 올리려고 애쓰지 않아도 괜찮아요.
          있는 그대로, 솔직하게 적어 주시는 게 제일 잘 맞아요.
        </p>
        <p className={styles.matchingLead}>
          최종 매칭표는 <strong>절대 비공개</strong>입니다!
          여러분은 매칭된 상대방 한 명만 알 수 있어요.
          그리고 점수, 순위는 알려드리지 않아요. (그렇게 중요하지도 않고요)
        </p>
      </div>
    </div>
  );
}
