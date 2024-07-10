
from gradio_client import Client


class KolorsClient:
    def __init__(self, model_name="gokaygokay/Kolors"):
        self.client = Client(model_name)
        self.negative_prompt = (
            "worst quality, normal quality, low quality, low res, blurry, text, watermark, logo, "
            "banner, extra digits, cropped, jpeg artifacts, signature, username, error, sketch, "
            "duplicate, ugly, monochrome, horror, geometry, mutation, disgusting"
        )

    def predict(
        self,
        positive_prompt,
        height=1024,
        width=1024,
        num_inference_steps=20,
        guidance_scale=5,
        num_images_per_prompt=1,
        use_random_seed=True,
        seed=0
    ):
        result = self.client.predict(
            prompt=positive_prompt,
            negative_prompt=self.negative_prompt,
            height=height,
            width=width,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            num_images_per_prompt=num_images_per_prompt,
            use_random_seed=use_random_seed,
            seed=seed,
            api_name="/predict"
        )
        return result


kolors_client = KolorsClient()
