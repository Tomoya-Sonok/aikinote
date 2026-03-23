import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import styles from "./PainPoints.module.css";

interface PainPointsProps {
  locale: string;
}

export async function PainPoints({ locale }: PainPointsProps) {
  const t = await getTranslations({ locale, namespace: "landing.painPoints" });

  const titleLines = t("title").split("\n");
  const items = t.raw("items") as string[];

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="pain-points" className={styles.section}>
      <span className={styles.bgLabel} aria-hidden="true">
        PROBLEMS
      </span>

      <h2 className={styles.title}>
        {titleLines.map((line, index) => (
          <Fragment key={line}>
            {line}
            {index < titleLines.length - 1 && <br />}
          </Fragment>
        ))}
      </h2>

      <div className={styles.divider} />

      <div className={styles.itemsWrapper}>
        <ul className={styles.items}>
          {items.map((item, index) => (
            <ScrollFadeIn key={item} delay={index * 150}>
              <li className={styles.item}>
                <Image
                  src="/images/lp/swirl.svg"
                  alt=""
                  width={29}
                  height={37}
                  className={styles.swirl}
                  aria-hidden="true"
                />
                <div className={styles.bubble}>
                  <p className={styles.bubbleText}>
                    {item.split("\n").map((line, i) => (
                      <Fragment key={line}>
                        {line}
                        {i < item.split("\n").length - 1 && <br />}
                      </Fragment>
                    ))}
                  </p>
                </div>
              </li>
            </ScrollFadeIn>
          ))}
        </ul>

        <div className={styles.illustration}>
          <Image
            src="/images/lp/pain-points.png"
            alt={t("imageAlt")}
            width={300}
            height={241}
            sizes="300px"
            className={styles.illustrationImage}
          />
        </div>
      </div>
    </section>
  );
}
