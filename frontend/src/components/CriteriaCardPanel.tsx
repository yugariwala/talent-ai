import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Pencil } from "lucide-react"

export interface CriteriaCard {
  must_haves: string[]
  nice_to_haves: string[]
  dimensions: { name: string; weight: number; description: string }[]
  proficiency_rubrics: Record<string, { Beginner: string; Intermediate: string; Advanced: string; Expert: string; required_level: string }>
  experience_range: { min: number; max: number; unit: string }
  education: { level: string; field: string; mandatory: boolean }
}

export interface CriteriaCardPanelProps {
  criteria: CriteriaCard | null
  onUpdate: (updated: Partial<CriteriaCard>) => void
}

export function CriteriaCardPanel({ criteria, onUpdate }: CriteriaCardPanelProps) {
  const [dimensions, setDimensions] = useState(criteria?.dimensions || [])
  const [mustHavesOpen, setMustHavesOpen] = useState(true)
  const [niceToHavesOpen, setNiceToHavesOpen] = useState(true)

  useEffect(() => {
    if (criteria?.dimensions) {
      setDimensions(criteria.dimensions)
    }
  }, [criteria?.dimensions])

  if (!criteria) {
    return (
      <div className="w-[240px] shrink-0 h-full p-4 flex items-center justify-center text-center text-sm text-muted-foreground border-r border-border bg-card">
        Complete JD intake to generate criteria.
      </div>
    )
  }

  const handleWeightChange = (index: number, newValue: number) => {
    const updated = [...dimensions]
    updated[index] = { ...updated[index], weight: newValue / 100 }
    
    const total = updated.reduce((sum, d) => sum + d.weight, 0)
    setDimensions(updated)
    
    if (Math.abs(total - 1.0) < 0.01) {
      onUpdate({ dimensions: updated })
    }
  }

  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)
  const isTotalValid = Math.abs(totalWeight - 1.0) < 0.01

  return (
    <div className="w-[240px] shrink-0 h-full flex flex-col border-r border-border bg-card text-foreground overflow-y-auto overflow-x-hidden">
      <div className="p-4 space-y-6">
        
        {/* Section 1: Dimensions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold shrink-0">Dimensions</h3>
            {!isTotalValid && (
              <span className="text-[10px] text-destructive font-medium leading-tight text-right">
                Weights must sum to 100%
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {dimensions.map((dim, idx) => {
              const weightPercent = Math.round(dim.weight * 100)
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate pr-2" title={dim.name}>
                      {dim.name}
                    </span>
                    <Badge variant={isTotalValid ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
                      {weightPercent}%
                    </Badge>
                  </div>
                  <Slider 
                    value={[weightPercent]}
                    max={100}
                    step={1}
                    onValueChange={(vals) => handleWeightChange(idx, vals[0])}
                    className="py-1 cursor-pointer"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 2: Must-haves */}
        <div className="space-y-2">
          <div 
            className="flex items-center gap-1 cursor-pointer select-none text-sm font-semibold group"
            onClick={() => setMustHavesOpen(!mustHavesOpen)}
          >
            {mustHavesOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            )}
            <h3>Must-haves</h3>
          </div>
          {mustHavesOpen && (
            <ul className="space-y-2 pl-1">
              {criteria.must_haves.map((item, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground items-start">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  <span className="leading-tight break-words">{item}</span>
                </li>
              ))}
              {criteria.must_haves.length === 0 && (
                <li className="text-xs text-muted-foreground italic pl-5">None</li>
              )}
            </ul>
          )}
        </div>

        {/* Section 3: Nice-to-haves */}
        <div className="space-y-2">
          <div 
            className="flex items-center gap-1 cursor-pointer select-none text-sm font-semibold group"
            onClick={() => setNiceToHavesOpen(!niceToHavesOpen)}
          >
            {niceToHavesOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            )}
            <h3>Nice-to-haves</h3>
          </div>
          {niceToHavesOpen && (
            <ul className="space-y-2 pl-1">
              {criteria.nice_to_haves.map((item, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground items-start">
                  <Circle className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" fill="currentColor" />
                  <span className="leading-tight break-words">{item}</span>
                </li>
              ))}
              {criteria.nice_to_haves.length === 0 && (
                <li className="text-xs text-muted-foreground italic pl-5">None</li>
              )}
            </ul>
          )}
        </div>

        {/* Section 4: Experience range */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Experience</h3>
          <div className="flex items-center gap-2 group">
            <span className="text-sm">
              {criteria.experience_range.min}–{criteria.experience_range.max} {criteria.experience_range.unit}
            </span>
            <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground transition-all">
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
