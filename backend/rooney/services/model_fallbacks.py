import os


DEFAULT_PRIMARY_MODEL = 'gemini-2.5-flash-lite'
DEFAULT_BACKUP_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
]


def _split_models(value):
    return [item.strip() for item in value.split(',') if item.strip()]


def get_gemini_model_chain():
    primary = os.environ.get('GEMINI_PRIMARY_MODEL', DEFAULT_PRIMARY_MODEL).strip() or DEFAULT_PRIMARY_MODEL
    backups = _split_models(os.environ.get('GEMINI_BACKUP_MODELS', ''))
    if not backups:
        backups = DEFAULT_BACKUP_MODELS

    chain = []
    for model in [primary, *backups]:
        if model not in chain:
            chain.append(model)
    return chain


def is_retryable_model_error(error):
    text = str(error).lower()
    retryable_markers = [
        '429',
        'resource_exhausted',
        'rate limit',
        'quota',
        'overloaded',
        'unavailable',
        '503',
        '500',
        'deadline',
        'timeout',
        'temporarily',
    ]
    return any(marker in text for marker in retryable_markers)
