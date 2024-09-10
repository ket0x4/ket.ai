
from gradio_client import Client

negative_portrait = """
EasyNegative, duplicate, deformed, dehydrated, disfigured, lowres, 
mutation, mutilated, poorly drawn face, unreal engine, unnatural pose, 
poorly drawn hands, mutated hands, poorly drawn feet, signature, text, 
written language, unfocused, printed words, unattractive, ugly, error, 
missing fingers, extra digit, fewer digits, cropped, worst quality, 
low quality, normal quality, jpeg artifacts, signature, watermark, 
username, blurry, (worst quality, low quality:1.4), (bad anatomy), 
(inaccurate limb:1.2), bad composition, inaccurate eyes, extra digit,
fewer digits, (extra arms:1.2), extra hands, uncreative, deformed structures, 
(bad-artist:0.6), bad-image-v2-39000, (her hair is styled with Straight Center Part:1.2), 
unnatural hair, unnatural eyes, unnatural bright, 
Fix Faces
"""

negative_default = """
deformed, lowres, error, worst quality, low quality, normal quality,
jpeg artifacts, signature, watermark, username, blurry
"""

class KolorsClient:
    def __init__(self, model_name="stabilityai/stable-diffusion-3-medium"):
        self.client = Client(model_name)
        self.negative_prompt = negative_default

    def predict(
        self,
        positive_prompt,
        height=1024,
        width=1024,
        num_inference_steps=25,
        guidance_scale=8,
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
            api_name="/infer"
        )
        return result


kolors_client = KolorsClient()
