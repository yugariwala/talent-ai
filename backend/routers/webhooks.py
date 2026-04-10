"""Webhooks router — webhook registration endpoints."""

from fastapi import APIRouter, HTTPException

from schemas import WebhookRegister

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/register")
async def register_webhook(body: WebhookRegister):
    raise NOT_IMPLEMENTED
