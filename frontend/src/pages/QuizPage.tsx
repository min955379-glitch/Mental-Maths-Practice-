import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, Clock, ArrowRight, ChevronRight, BookOpen, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Button, Badge, ProgressBar, Spinner } from "@/components/ui";
import clsx from "clsx";

export function QuizPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<any>(null);
  const [finished, setFinished] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load first question
  useEffect(() => {
    if (!sessionId) return;
    loadNext();
  }, [sessionId]);

  const loadNext = async () => {
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    try {
      const data = await api.nextQuestion(sessionId!);
      if (data.finished) {
        setFinished(true);
        await api.completeQuiz(sessionId!);
        navigate(`/results/${sessionId}`);
        return;
      }
      setQuestion(data);
      if (data.timerSeconds && timerSeconds === null) {
        setTimerSeconds(data.timerSeconds);
      }
      startTimeRef.current = Date.now();
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: any) {
      alert(e.message);
      navigate("/practice");
    }
  };

  // Timer
  useEffect(() => {
    if (timerSeconds === null || finished || feedback) return;
    if (timerSeconds <= 0) {
      handleTimeUp();
      return;
    }
    const t = setTimeout(() => setTimerSeconds((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timerSeconds, finished, feedback]);

  const handleTimeUp = () => {
    if (submitting || feedback) return;
    submit("0");
  };

  const submit = async (override?: string) => {
    if (submitting || feedback) return;
    const userAnswer = override !== undefined ? override : answer;
    if (!userAnswer.trim()) return;
    setSubmitting(true);
    const responseTimeMs = Date.now() - startTimeRef.current;
    try {
      const result = await api.submitAnswer({
        sessionId: sessionId!,
        questionId: question.question.id,
        userAnswer,
        responseTimeMs,
      });
      setFeedback(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (feedback) {
        loadNext();
      } else if (answer.trim()) {
        submit();
      }
    }
  };

  if (loading && !question) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (finished) return null;

  if (!question) return null;

  const progress = question.position;
  const total = question.total;
  const timerColor = timerSeconds !== null && timerSeconds < 60 ? "text-red-600" : "text-slate-700 dark:text-navy-200";
  const minutes = timerSeconds !== null ? Math.floor(timerSeconds / 60) : 0;
  const seconds = timerSeconds !== null ? timerSeconds % 60 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-navy-400">Mental Math</div>
          {timerSeconds !== null && (
            <div className={clsx("flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums", timerColor)}>
              <Clock className="w-4 h-4" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600 dark:text-navy-300">
            Question <span className="font-bold text-slate-900 dark:text-navy-50">{progress}</span> of {total}
          </div>
          <div className="text-xs text-slate-500 dark:text-navy-400">{question.question.category} · {question.question.difficulty}</div>
        </div>
        <ProgressBar value={progress - (feedback ? 0.5 : 0)} max={total} color="indigo" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.question.id + (feedback ? "-fb" : "-q")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {!feedback ? (
            <Card elevated className="p-6 sm:p-8">
              <div className="text-base sm:text-lg leading-relaxed text-slate-900 dark:text-navy-50 font-medium">
                {question.question.text}
              </div>

              <div className="mt-8">
                <label className="block text-sm font-medium text-slate-700 dark:text-navy-200 mb-2">
                  Type your answer
                  {question.question.unit && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-navy-400 font-normal">include {question.question.unit} if asked</span>
                  )}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="input text-2xl sm:text-3xl font-semibold text-center py-5 sm:py-6"
                  placeholder="Your answer"
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-navy-500">Press Enter to submit</span>
                  <Button onClick={() => submit()} disabled={!answer.trim() || submitting} loading={submitting} size="lg">
                    Submit Answer
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <FeedbackCard feedback={feedback} onNext={loadNext} isLast={progress === total} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FeedbackCard({ feedback, onNext, isLast }: { feedback: any; onNext: () => void; isLast: boolean }) {
  const isCorrect = feedback.isCorrect;
  return (
    <div className="space-y-4">
      <Card elevated className={clsx("p-6 sm:p-8 border-2", isCorrect ? "border-emerald-300 dark:border-emerald-800" : "border-red-300 dark:border-red-800")}>
        <div className="flex items-start gap-4">
          <div className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
          )}>
            {isCorrect ? <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={3} /> : <X className="w-6 h-6 text-red-600 dark:text-red-400" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className={clsx("text-lg font-bold", isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
              {isCorrect ? "Your answer is correct" : "Your answer is incorrect"}
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-navy-300">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>Your answer: <span className="font-semibold text-slate-900 dark:text-navy-50">{feedback.userAnswer}</span></span>
                {!isCorrect && <span>Correct: <span className="font-semibold text-slate-900 dark:text-navy-50">{feedback.correctAnswer}</span></span>}
                {isCorrect && <span>Answer: <span className="font-semibold text-slate-900 dark:text-navy-50">{feedback.correctAnswer}</span></span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-navy-50">Fast Mental Trick</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-navy-200 leading-relaxed whitespace-pre-line">{feedback.shortcut}</p>
      </Card>

      <Card className="p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-navy-50">Why it works</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-navy-200 leading-relaxed">{feedback.explanation}</p>
      </Card>

      {feedback.mentalPattern && (
        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-navy-50">Mental Pattern</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-navy-200 leading-relaxed italic">{feedback.mentalPattern}</p>
        </Card>
      )}

      {!isCorrect && feedback.commonMistake && (
        <Card className="p-5 sm:p-6 border-l-4 border-amber-400">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">Common mistake</div>
          <p className="text-sm text-slate-700 dark:text-navy-200 leading-relaxed">{feedback.commonMistake}</p>
        </Card>
      )}

      <div className="flex items-center justify-end pt-2">
        <Button onClick={onNext} size="lg">
          {isLast ? "View Results" : "Next Question"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
