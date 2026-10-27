// Config: change this one line to teacher's WhatsApp (international format, no +)
const TEACHER_WHATSAPP = "972500000000";
const DEFAULT_MSG = encodeURIComponent("السلام عليكم، أنا ... من الصف ... أرسل فيديو تجربة الماء 💧");

const questions = [
  { q: "هل يطفو الخشب على الماء؟", a: "yes", info: "صح! الخشب خفيف ويطفو 🪵" },
  { q: "هل يغرق الحجر الصغير؟", a: "no", info: "الحجر يغرق لأنه ثقيل 🪨" },
  { q: "هل تطفو التفاحة؟", a: "yes", info: "صح! التفاحة فيها هواء وتطفو 🍎" },
  { q: "هل تغرق الملعقة الحديد؟", a: "no", info: "الحديد يغرق 🥄" },
  { q: "هل يطفو غطاء البلاستيك؟", a: "yes", info: "صح! البلاستيك الخفيف يطفو 🧢" },
];
let qi = 0;

function el(id){ return document.getElementById(id); }

document.addEventListener("DOMContentLoaded", () => {
  // WhatsApp button
  const wa = el("waBtn");
  if (wa) wa.href = `https://wa.me/${TEACHER_WHATSAPP}?text=${DEFAULT_MSG}`;

  // Video fallback: hide if real video exists
  const vid = el("teacherVideo"), fb = el("videoFallback");
  if (vid && fb) {
    vid.addEventListener("error", () => fb.classList.remove("has-video"), true);
    // check if source loads
    const src = vid.querySelector("source");
    if (src) {
      fetch(src.getAttribute("src"), { method: "HEAD" }).then(r => {
        if (r.ok) fb.classList.add("has-video");
      }).catch(()=>{});
    }
    const demoBtn = el("demoPlayBtn");
    if (demoBtn) demoBtn.addEventListener("click", () => {
      alert("🎬 في النسخة النهائية سيعمل هنا فيديو المعلمة (دقيقتان).\nللتجربة ضعي ملف videos/teacher-01-maa.mp4");
    });
  }

  // Quiz
  const qEl = el("quizQ"), fEl = el("quizFeedback"), nextBtn = el("nextQBtn");
  if (qEl && fEl) {
    document.querySelectorAll(".quiz-btns .btn").forEach(b => {
      b.addEventListener("click", () => {
        const correct = b.dataset.answer === questions[qi].a;
        fEl.textContent = (correct ? "🎉 أحسنت! " : "💪 حاول مرة أخرى! ") + questions[qi].info;
        fEl.className = "quiz-feedback " + (correct ? "good" : "bad");
        if (correct) b.animate([{transform:"scale(1)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],{duration:400});
      });
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      qi = (qi + 1) % questions.length;
      qEl.textContent = questions[qi].q;
      fEl.textContent = "اختار إجابتك يا بطل! 🦸";
      fEl.className = "quiz-feedback";
    });
  }
});
