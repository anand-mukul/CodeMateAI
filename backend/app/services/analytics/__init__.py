"""
CodeMate AI — Analytics Package
"""

from app.services.analytics.event_schema import (
    AnalyticsBatchRequest,
    AnalyticsEventDTO,
    AnalyticsOverviewResponse,
    AnalyticsPreferenceDTO,
)
from app.services.analytics.event_validator import EventValidator
from app.services.analytics.event_collector import EventCollector
from app.services.analytics.event_aggregator import EventAggregator
from app.services.analytics.analytics_queries import AnalyticsQueries
from app.services.analytics.analytics_retention import AnalyticsRetentionService

__all__ = [
    "AnalyticsEventDTO",
    "AnalyticsBatchRequest",
    "AnalyticsPreferenceDTO",
    "AnalyticsOverviewResponse",
    "EventValidator",
    "EventCollector",
    "EventAggregator",
    "AnalyticsQueries",
    "AnalyticsRetentionService",
]

