import Link from "next/link";
import { TERMS, bonusFor, naira } from "@/lib/creator-terms";
export { CREATOR_TERMS_VERSION } from "@/lib/creator-terms";

// the creator partnership's terms and conditions: the public page (/creator-terms) and the application (/creator)
// both show this. the numbers come from lib/creator-terms, so the terms always match what the dashboard pays.

const n = (x: number) => x.toLocaleString("en-NG");

export function CreatorTermsBody() {
  return (
    <>
      <section>
        <h2>1. About these terms</h2>
        <p>
          These terms are an agreement between you and Ivyward (&ldquo;Ivyward&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) for the Ivyward Creator Partnership (the &ldquo;Partnership&rdquo;): you make content about Ivyward, share your own tracked links, and we pay you for qualified sign-ups. You accept them when you tick the box on the application and send it. They apply together with Ivyward&apos;s{" "}
          <Link href="/terms">Terms of use</Link> and <Link href="/privacy">Privacy policy</Link>; where they differ on the Partnership, these terms apply.
        </p>
        <p>The campaign guide we share with you explains how we&apos;d like you to present Ivyward. It is part of these terms where it sets rules; where the guide and these terms differ, these terms apply.</p>
      </section>

      <section>
        <h2>2. Who can take part</h2>
        <ul>
          <li>You must be at least 18 years old (or the age of majority where you live, if higher) and able to enter a contract.</li>
          <li>You take part as one person, with one creator account, using your own Ivyward account. Accounts can&apos;t be shared, sold or transferred.</li>
          <li>The information in your application, including your handles and follower numbers, must be true and kept up to date.</li>
          <li>We review every application and may accept or decline it at our discretion. Being approved once doesn&apos;t guarantee a place in later campaigns.</li>
        </ul>
      </section>

      <section>
        <h2>3. Our relationship</h2>
        <p>
          You take part as an independent creator, not as an employee, agent, partner or representative of Ivyward. You can&apos;t make promises, sign agreements or speak on Ivyward&apos;s behalf, and you decide how, when and where you make your content within these terms. The Partnership is not exclusive: you may work with other brands, but you may not promote Ivyward and a directly competing application service in the same piece of content.
        </p>
      </section>

      <section>
        <h2>4. Your links and how sign-ups are tracked</h2>
        <ul>
          <li>You can make up to {TERMS.maxLinks} tracked links (tryivyward.com/c/&hellip;) in your creator dashboard. Use only your own links; don&apos;t hide, shorten through a service that strips tracking, or disguise them.</li>
          <li>A sign-up is linked to you when someone visits through your link and creates a new Ivyward account within 30 days, on the same device or through the sign-in email it sends. If they visited through more than one creator&apos;s link, the last link they used counts. Each account counts for one creator only, and existing Ivyward accounts don&apos;t count.</li>
          <li>Visits count once per person, per link, per day. Link previews, automated traffic and your own visits while signed in aren&apos;t counted.</li>
          <li>Tracking depends on browsers, apps and networks we don&apos;t control. We&apos;ll fix errors we find, but our records are what we use to work out what you&apos;re owed. If you think something is missing, tell us within 30 days of the end of the month it happened in.</li>
        </ul>
      </section>

      <section>
        <h2>5. What counts as a qualified sign-up</h2>
        <p>A qualified sign-up is a real, individual person who, through your link:</p>
        <ul>
          <li>creates a new Ivyward account;</li>
          <li>uploads their CV; and</li>
          <li>completes the basic profile in setup (the degree they&apos;re applying for and where they want to study).</li>
        </ul>
        <p>These never count, and we may remove them from your numbers at any time, including after they were counted:</p>
        <ul>
          <li>a second or later account from the same person or the same device;</li>
          <li>your own accounts, or accounts you create for or with someone else&apos;s details;</li>
          <li>sign-ups you paid for or rewarded in any way (money, airtime, gifts, giveaways, or a share of your earnings);</li>
          <li>fake, automated or bot accounts, or sign-ups from bought or incentivised traffic;</li>
          <li>sign-ups from spam, misleading claims, or anything else these terms don&apos;t allow; and</li>
          <li>accounts we suspend or remove for breaking Ivyward&apos;s Terms of use.</li>
        </ul>
      </section>

      <section>
        <h2>6. What you&apos;re paid</h2>
        <ul>
          <li>
            <strong>The pay floor.</strong> A calendar month pays once you reach {n(TERMS.payFrom)} qualified sign-ups in it. From then on, every qualified sign-up in that month earns your rate, counting the first {n(TERMS.payFrom)}. A month that ends with fewer than {n(TERMS.payFrom)} qualified sign-ups pays nothing, and its sign-ups don&apos;t carry into the next month.
          </li>
          <li>
            <strong>Your rate.</strong> {naira(TERMS.rate)} per qualified sign-up, unless your dashboard shows a different rate agreed with you. A sign-up earns the rate in force on the day it qualifies.
          </li>
          <li>
            <strong>The bonus.</strong> For every full {n(TERMS.bonusStep)} qualified sign-ups above {n(TERMS.bonusFrom)} in a month, you earn a bonus of {naira(TERMS.bonusPerStep)}, with no upper limit. For example, {n(1000)} qualified sign-ups in a month earn {naira(1000 * TERMS.rate)} at the standard rate plus a {naira(bonusFor(1000))} bonus: {naira(1000 * TERMS.rate + bonusFor(1000))}. The bonus is added once the month has ended.
          </li>
          <li>
            <strong>The monthly target.</strong> The target is {n(TERMS.target)} qualified sign-ups a month. It&apos;s the goal we plan campaigns around; missing it doesn&apos;t reduce what you&apos;ve earned.
          </li>
          <li>Months run on West Africa Time (Lagos). A sign-up belongs to the month in which it qualified, not the month the account was made.</li>
          <li>Earnings are counted in Nigerian naira.</li>
        </ul>
      </section>

      <section>
        <h2>7. Payouts</h2>
        <ul>
          <li>You can ask for a payout from your dashboard once your available balance is {naira(TERMS.minWithdrawal)} or more. You can have one request open at a time.</li>
          <li>We send payouts by bank transfer or mobile money within {TERMS.payoutHours} hours of your request, unless the request needs a review under these terms or a payment network is down, in which case we&apos;ll tell you and send it as soon as we can.</li>
          <li>Payouts go only to the payout details saved in your dashboard, in the name you give. Check them carefully: if money reaches the wrong account because the details you gave were wrong, we&apos;ll help you ask for it back, but we can&apos;t pay it twice.</li>
          <li>If you&apos;re paid in a currency other than naira, we convert at the rate available to us on the day we send it. We pay our own transfer fees. Charges taken by intermediary or receiving banks, mostly on international transfers, can reduce the amount you receive.</li>
          <li>We may hold a payout for up to 30 days while we review unusual activity, such as a sudden jump in sign-ups from one device, network or place. If sign-ups turn out not to qualify, we remove them, and if they were already paid, we deduct that amount from your future earnings or ask you to repay it.</li>
          <li>You&apos;re responsible for any tax on what you earn and for registering where your country requires it. We may ask for tax information, and we&apos;ll withhold tax where the law requires us to.</li>
        </ul>
      </section>

      <section>
        <h2>8. The content you make</h2>
        <ul>
          <li>Post at least {TERMS.videosPerMonth} original videos about Ivyward each month, at least one a week, ideally 30 to 90 seconds and vertical (9:16), on TikTok, Instagram or other platforms we&apos;ve agreed with you.</li>
          <li>Add the link to each video in your dashboard. We review what you post and may ask you to change or remove a video that breaks these terms.</li>
          <li>Missing the content minimum doesn&apos;t cancel pay you&apos;ve earned, but if it keeps happening we may pause your account.</li>
          <li>Your content must be your own work. Don&apos;t copy another creator&apos;s video or script word for word, and make sure you have the rights to the music, footage and images you use.</li>
        </ul>
      </section>

      <section>
        <h2>9. Honesty and disclosure</h2>
        <ul>
          <li>Say clearly, in every piece of content, that it&apos;s a paid partnership with Ivyward: out loud or on screen, and in the caption (for example #ad or #IvywardPartner), and use the platform&apos;s own paid-partnership label where it has one.</li>
          <li>Share only your real experience. If you haven&apos;t tried a feature, applied to a school or received an offer, don&apos;t say or suggest that you have. Exploring the platform and saying so is fine.</li>
          <li>Never promise or suggest that Ivyward guarantees admission, scholarships, funding, fee waivers or visas. Schools, funders and governments make their own decisions.</li>
          <li>Don&apos;t describe features, prices or results Ivyward doesn&apos;t offer, and don&apos;t suggest that any university, government or scholarship body endorses Ivyward.</li>
          <li>Follow the advertising and consumer protection rules where you and your audience are, and each platform&apos;s rules on branded content.</li>
        </ul>
      </section>

      <section>
        <h2>10. What you must not do</h2>
        <ul>
          <li>Send spam: unsolicited direct messages, mass comments, email or SMS blasts, or posting your link in groups or threads that don&apos;t allow promotion.</li>
          <li>Pay, reward or pressure anyone to sign up, or run giveaways or contests tied to signing up, unless we&apos;ve agreed it with you in writing.</li>
          <li>Buy traffic, use bots or click farms, or run paid ads that use the Ivyward name or bid on it as a search keyword, unless we&apos;ve agreed it with you in writing.</li>
          <li>Create social accounts, pages, groups, websites, apps or domains that use the Ivyward name or could be mistaken for Ivyward, or present yourself as Ivyward staff or support.</li>
          <li>Collect people&apos;s CVs, documents, passwords or personal details, or create or fill in Ivyward accounts for them.</li>
          <li>Post hateful, harassing, sexual, violent or unlawful content, or content aimed at children under 16, alongside Ivyward.</li>
          <li>Try to find out who signed up through your links, or contact them because they did.</li>
        </ul>
      </section>

      <section>
        <h2>11. Using the Ivyward name</h2>
        <p>
          While you&apos;re in the Partnership, you may use the Ivyward name and logo, and screenshots or screen recordings of your own Ivyward account, to make content under these terms. Don&apos;t change the logo, combine it with other marks, or use it in a way that suggests a different relationship. This permission ends when your participation ends.
        </p>
      </section>

      <section>
        <h2>12. Who owns the content</h2>
        <p>
          You keep ownership of the content you make. You give Ivyward a non-exclusive, worldwide, royalty-free licence to share, repost, embed, quote and show your Partnership content, with credit to you where the format allows, on Ivyward&apos;s own website, social channels and newsletters, during the Partnership and for 12 months after it ends. We&apos;ll ask for your written permission before using your content in paid advertising.
        </p>
      </section>

      <section>
        <h2>13. Your information and the people you bring</h2>
        <ul>
          <li>We use what you give us (your application, handles, phone number, payout details and link activity) to run the Partnership, pay you, prevent fraud and meet legal duties, as our Privacy policy explains. Your payout details are stored encrypted and used only to pay you.</li>
          <li>Your dashboard shows how far each sign-up got, with an initial only. We never share who they are, and their information is handled under Ivyward&apos;s Privacy policy and the data protection laws that apply, including Nigeria&apos;s Data Protection Act 2023.</li>
        </ul>
      </section>

      <section>
        <h2>14. Confidential information</h2>
        <p>Keep to yourself anything about Ivyward that isn&apos;t public and that we share with you through the Partnership, such as features before launch, other creators&apos; terms or numbers, and campaign plans, unless we agree otherwise in writing.</p>
      </section>

      <section>
        <h2>15. Pausing and ending the Partnership</h2>
        <ul>
          <li>You can leave at any time by telling us. We can end your participation at any time with notice to you.</li>
          <li>We may pause or end your participation immediately if you break these terms, if your account shows signs of fraud, or if your content could harm Ivyward&apos;s users or reputation. While your account is paused, visits and sign-ups through your links aren&apos;t counted.</li>
          <li>When your participation ends, your links stop counting. We pay your available balance, including months that had already reached the pay floor, after any review under section 7, except earnings linked to a breach of these terms, which you lose.</li>
          <li>Your content can stay up after you leave as long as it keeps the paid-partnership disclosure and follows these terms. Remove or correct content if we ask you to because it breaks them.</li>
        </ul>
      </section>

      <section>
        <h2>16. Changes</h2>
        <p>
          We may change these terms, the rates, the pay floor, the target or the bonus. We&apos;ll tell you at least 14 days before a change that affects your pay takes effect, by email and in your dashboard. Changes never reduce pay for sign-ups that qualified before the change. If you keep taking part after a change takes effect, you accept it. We may end the Partnership for everyone with 30 days&apos; notice; we&apos;ll pay what you&apos;ve earned under these terms.
        </p>
      </section>

      <section>
        <h2>17. Liability</h2>
        <p>
          We provide the Partnership, the dashboard and the tracking as they are. We don&apos;t promise that tracking will be uninterrupted or catch every visit or sign-up. As far as the law allows, we aren&apos;t responsible for indirect losses, such as lost opportunities or followers, and our total liability to you under these terms is limited to what we paid or owe you in the three months before the claim. Nothing in these terms limits liability that the law doesn&apos;t allow us to limit.
        </p>
        <p>You agree to cover Ivyward&apos;s reasonable losses and costs that result from your content or conduct breaking the law, someone else&apos;s rights, or these terms.</p>
      </section>

      <section>
        <h2>18. Disputes and the law that applies</h2>
        <p>
          If something goes wrong, contact us first: we&apos;ll try to sort it out within 30 days. These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Lagos State have jurisdiction over any dispute that can&apos;t be settled, unless the law where you live gives you the right to bring it elsewhere.
        </p>
      </section>

      <section>
        <h2>19. General</h2>
        <p>
          If any part of these terms can&apos;t be enforced, the rest still applies. If we don&apos;t enforce a term straight away, we can still enforce it later. You can&apos;t transfer your rights under these terms to anyone else. These terms, the campaign guide and anything we agree with you in writing are the whole agreement about the Partnership.
        </p>
      </section>
    </>
  );
}
