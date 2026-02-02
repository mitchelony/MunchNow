import contextvars
from dataclasses import dataclass


@dataclass
class RequestMetrics:
    query_count: int = 0


_metrics = contextvars.ContextVar("request_metrics", default=None)


def reset_query_count() -> None:
    _metrics.set(RequestMetrics())


def increment_query_count(value: int = 1) -> None:
    metrics = _metrics.get()
    if metrics is None:
        metrics = RequestMetrics()
        _metrics.set(metrics)
    metrics.query_count += value


def get_query_count() -> int:
    metrics = _metrics.get()
    return metrics.query_count if metrics else 0
