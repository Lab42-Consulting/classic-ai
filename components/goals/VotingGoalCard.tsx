"use client";

import { useState } from "react";

interface GoalOption {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  targetAmount: number;
  voteCount: number;
  percentage: number;
}

interface VotingGoal {
  id: string;
  name: string;
  description: string | null;
  votingEndsAt: string | null;
  daysUntilDeadline: number;
  hoursUntilDeadline: number;
  totalVotes: number;
  myVoteOptionId: string | null;
  options: GoalOption[];
}

interface VotingGoalCardProps {
  goal: VotingGoal;
  onVote: (goalId: string, optionId: string) => Promise<void>;
}

export function VotingGoalCard({ goal, onVote }: VotingGoalCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(goal.myVoteOptionId);
  const [localOptions, setLocalOptions] = useState(goal.options);
  const [localTotalVotes, setLocalTotalVotes] = useState(goal.totalVotes);

  const handleVote = async (optionId: string) => {
    if (isVoting || optionId === selectedOptionId) return;

    setIsVoting(true);
    try {
      await onVote(goal.id, optionId);

      // Optimistically update local state
      const previousOptionId = selectedOptionId;
      setSelectedOptionId(optionId);

      // Update vote counts
      setLocalOptions((prev) =>
        prev.map((opt) => {
          if (opt.id === optionId) {
            return { ...opt, voteCount: opt.voteCount + 1 };
          }
          if (opt.id === previousOptionId) {
            return { ...opt, voteCount: Math.max(0, opt.voteCount - 1) };
          }
          return opt;
        })
      );

      // Update total votes only if this is a new vote (not a change)
      if (!previousOptionId) {
        setLocalTotalVotes((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setIsVoting(false);
    }
  };

  // Recalculate percentages based on local state
  const optionsWithPercentages = localOptions.map((opt) => ({
    ...opt,
    percentage: localTotalVotes > 0 ? Math.round((opt.voteCount / localTotalVotes) * 100) : 0,
  }));

  // Format deadline display
  const deadlineText =
    goal.daysUntilDeadline > 0
      ? `${goal.daysUntilDeadline} ${goal.daysUntilDeadline === 1 ? "dan" : "dana"}`
      : goal.hoursUntilDeadline > 0
        ? `${goal.hoursUntilDeadline} ${goal.hoursUntilDeadline === 1 ? "sat" : "sati"}`
        : "Uskoro završava";

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🗳️</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">{goal.name}</h3>
          <p className="text-xs text-foreground-muted">Glasaj za opremu!</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-blue-400 font-medium">{deadlineText}</div>
          <div className="text-xs text-foreground-muted">{localTotalVotes} glasova</div>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-sm text-foreground-muted mb-4 line-clamp-2">{goal.description}</p>
      )}

      {/* Options */}
      <div className="space-y-3">
        {optionsWithPercentages.map((option) => {
          const isSelected = option.id === selectedOptionId;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isVoting}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                isSelected
                  ? "bg-blue-500/20 border-2 border-blue-500"
                  : "bg-white/5 border-2 border-transparent hover:border-blue-500/30"
              } ${isVoting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Option Image */}
                {option.imageUrl ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={option.imageUrl}
                      alt={option.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🏋️</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {option.name}
                    </span>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {isSelected && (
                        <span className="text-blue-400 text-xs font-medium">Tvoj glas</span>
                      )}
                      <span className="text-sm font-bold text-blue-400">{option.percentage}%</span>
                    </div>
                  </div>

                  {/* Vote progress bar */}
                  <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? "bg-blue-500" : "bg-blue-500/50"
                      }`}
                      style={{ width: `${option.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-foreground-muted">
                      {option.voteCount} {option.voteCount === 1 ? "glas" : "glasova"}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Cilj: {option.targetAmount.toLocaleString("sr-RS")}€
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="text-xs text-foreground-muted text-center mt-4">
        {selectedOptionId
          ? "Možeš promeniti svoj glas do isteka roka"
          : "Klikni na opciju da glasaš"}
      </p>
    </div>
  );
}

// Compact version for listing multiple voting goals
export function VotingGoalsSection({
  goals,
  onVote,
}: {
  goals: VotingGoal[];
  onVote: (goalId: string, optionId: string) => Promise<void>;
}) {
  if (goals.length === 0) return null;

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <VotingGoalCard key={goal.id} goal={goal} onVote={onVote} />
      ))}
    </div>
  );
}
